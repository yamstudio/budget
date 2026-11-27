using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ExpenseGrouping
{
    Category,
    Vendor,
    PaymentMethod,
    Necessity,
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum IncomeGrouping
{
    Category,
    Source,
}

/// <summary>Read-only aggregates for the Insights page. An empty filter list means "no filter".</summary>
[Route("api/insights", Name = "Insights API")]
[ApiController]
public class InsightsApiController(BudgetDbContext context) : ControllerBase
{
    [HttpGet("expenses", Name = "Get Expense Breakdown")]
    public async Task<ActionResult<ICollection<BreakdownRow>>> GetExpenseBreakdown(
        [BindRequired, FromQuery(Name = "fromDate")] DateOnly fromDate,
        [BindRequired, FromQuery(Name = "toDate")] DateOnly toDate,
        [BindRequired, FromQuery(Name = "groupBy")] ExpenseGrouping groupBy,
        [FromQuery(Name = "byMonth")] bool byMonth,
        [FromQuery(Name = "expenseCategoryIds")] int[]? expenseCategoryIds,
        [FromQuery(Name = "vendorIds")] int[]? vendorIds,
        [FromQuery(Name = "paymentMethodIds")] int[]? paymentMethodIds,
        [FromQuery(Name = "necessities")] ExpenseNecessity[]? necessities
    )
    {
        if (fromDate > toDate)
        {
            return BadRequest("fromDate must not be after toDate.");
        }
        var expenses = context.Expenses.Where(e => e.Date >= fromDate && e.Date <= toDate);
        if (expenseCategoryIds is { Length: > 0 })
        {
            expenses = expenses.Where(e => expenseCategoryIds.Contains(e.ExpenseCategoryID));
        }
        if (vendorIds is { Length: > 0 })
        {
            expenses = expenses.Where(e => vendorIds.Contains(e.VendorID));
        }
        if (paymentMethodIds is { Length: > 0 })
        {
            expenses = expenses.Where(e => paymentMethodIds.Contains(e.PaymentMethodID));
        }
        if (necessities is { Length: > 0 })
        {
            expenses = expenses.Where(e => necessities.Contains(e.ExpenseCategory!.Necessity));
        }

        var groups = await (
            from e in expenses
            group e by new
            {
                Key = groupBy == ExpenseGrouping.Category ? e.ExpenseCategoryID
                    : groupBy == ExpenseGrouping.Vendor ? e.VendorID
                    : groupBy == ExpenseGrouping.PaymentMethod ? e.PaymentMethodID
                    : (int)e.ExpenseCategory!.Necessity,
                Year = byMonth ? e.Date.Year : 0,
                Month = byMonth ? e.Date.Month : 0,
            } into g
            select new { g.Key.Key, g.Key.Year, g.Key.Month, Amount = g.Sum(e => e.Amount) }
        ).ToListAsync();

        var labels = groupBy switch
        {
            ExpenseGrouping.Category => await context.ExpenseCategories.ToDictionaryAsync(c => c.ExpenseCategoryID, c => c.DisplayName),
            ExpenseGrouping.Vendor => await context.Vendors.ToDictionaryAsync(v => v.VendorID, v => v.DisplayName),
            ExpenseGrouping.PaymentMethod => await context.PaymentMethods.ToDictionaryAsync(p => p.PaymentMethodID, p => p.DisplayName),
            _ => Enum.GetValues<ExpenseNecessity>().ToDictionary(n => (int)n, n => n.ToString()),
        };
        return ToRows(groups.Select(g => (g.Key, g.Year, g.Month, g.Amount)), labels);
    }

    [HttpGet("incomes", Name = "Get Income Breakdown")]
    public async Task<ActionResult<ICollection<BreakdownRow>>> GetIncomeBreakdown(
        [BindRequired, FromQuery(Name = "fromDate")] DateOnly fromDate,
        [BindRequired, FromQuery(Name = "toDate")] DateOnly toDate,
        [BindRequired, FromQuery(Name = "groupBy")] IncomeGrouping groupBy,
        [FromQuery(Name = "byMonth")] bool byMonth
    )
    {
        if (fromDate > toDate)
        {
            return BadRequest("fromDate must not be after toDate.");
        }
        var groups = await (
            from i in context.Incomes
            where i.Date >= fromDate && i.Date <= toDate
            group i by new
            {
                Key = groupBy == IncomeGrouping.Category ? i.IncomeCategoryID : i.IncomeSourceID,
                Year = byMonth ? i.Date.Year : 0,
                Month = byMonth ? i.Date.Month : 0,
            } into g
            select new { g.Key.Key, g.Key.Year, g.Key.Month, Amount = g.Sum(i => i.Amount) }
        ).ToListAsync();

        var labels = groupBy == IncomeGrouping.Category
            ? await context.IncomeCategories.ToDictionaryAsync(c => c.IncomeCategoryID, c => c.DisplayName)
            : await context.IncomeSources.ToDictionaryAsync(s => s.IncomeSourceID, s => s.DisplayName);
        return ToRows(groups.Select(g => (g.Key, g.Year, g.Month, g.Amount)), labels);
    }

    private static List<BreakdownRow> ToRows(IEnumerable<(int Key, int Year, int Month, decimal Amount)> groups, Dictionary<int, string> labels) =>
        groups
            .Select(g => new BreakdownRow
            {
                Key = g.Key,
                Label = labels.GetValueOrDefault(g.Key, $"#{g.Key}"),
                Month = g.Year == 0 ? null : new DateOnly(g.Year, g.Month, 1),
                Amount = g.Amount,
            })
            .OrderBy(r => r.Month)
            .ThenByDescending(r => r.Amount)
            .ToList();
}
