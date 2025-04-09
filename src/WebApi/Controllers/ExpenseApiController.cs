using System.Collections.Immutable;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("api/expenses", Name = "Expense API")]
[ApiController]
public class ExpenseApiController : ControllerBase
{
    private readonly BudgetDbContext _context;

    public ExpenseApiController(BudgetDbContext context)
    {
        _context = context;
    }

    [HttpGet(Name = "Get Expenses")]
    public async Task<ActionResult<ICollection<Expense>>> GetExpenses(
        [BindRequired, FromQuery(Name = "fromDate")] DateOnly fromDate,
        [BindRequired, FromQuery(Name = "toDate")] DateOnly toDate
    )
    {
        return await _context.Expenses
            .Where(e => e.Date >= fromDate)
            .Where(e => e.Date <= toDate)
            .ToListAsync();
    }

    [HttpPost(Name = "Create Expense")]
    public async Task<Expense> CreateExpense(
        [Bind(
            [
                nameof(Expense.ExpenseCategoryID),
                nameof(Expense.VendorID),
                nameof(Expense.PaymentMethodID),
                nameof(Expense.Amount),
                nameof(Expense.Date),
                nameof(Expense.Note),
                nameof(Expense.ExpenseCategory),
                nameof(Expense.Vendor),
                nameof(Expense.PaymentMethod),
            ]
        )] Expense expense
    )
    {
        _context.Add(expense);
        await _context.SaveChangesAsync();
        return expense;
    }

    [HttpPut("{expenseId}", Name = "Update Expense")]
    public async Task<ActionResult<Expense>> UpdateExpense(
        int expenseId,
        [Bind(
            [
                nameof(Expense.ExpenseCategoryID),
                nameof(Expense.VendorID),
                nameof(Expense.PaymentMethodID),
                nameof(Expense.Amount),
                nameof(Expense.Date),
                nameof(Expense.Note),
            ]
        )] Expense expense
    )
    {
        var expenseToUpdate = await _context.Expenses.FirstOrDefaultAsync(e => e.ExpenseID == expenseId);
        if (expenseToUpdate == null)
        {
            return NotFound();
        }
        expenseToUpdate.ExpenseCategoryID = expense.ExpenseCategoryID;
        expenseToUpdate.VendorID = expense.VendorID;
        expenseToUpdate.PaymentMethodID = expense.PaymentMethodID;
        expenseToUpdate.Amount = expense.Amount;
        expenseToUpdate.Date = expense.Date;
        expenseToUpdate.Note = expense.Note;
        await _context.SaveChangesAsync();
        return expense;
    }

    [HttpDelete("{expenseId}", Name = "Delete Expense")]
    public async Task<ActionResult<Expense>> DeleteExpense(int expenseId)
    {
        var expenseToDelete = await _context.Expenses.FirstOrDefaultAsync(e => e.ExpenseID == expenseId);
        if (expenseToDelete == null)
        {
            return NotFound();
        }
        _context.Remove(expenseToDelete);
        await _context.SaveChangesAsync();
        return expenseToDelete;
    }

    [HttpGet("summary", Name = "Get Expense Summary")]
    public ExpenseSummary GetExpenseSummary(
        [BindRequired, FromQuery(Name = "fromDate")] DateOnly fromDate,
        [BindRequired, FromQuery(Name = "toDate")] DateOnly toDate,
        [FromQuery(Name = "aggregateByExpenseCategory")] bool aggregateByExpenseCategory
    )
    {
        var periods = (
            from expense in _context.Expenses
            where expense.Date >= fromDate
            where expense.Date <= toDate
            group expense by new
            {
                expense.Date.Year,
                expense.Date.Month,
                ExpenseCategoryID = aggregateByExpenseCategory ? expense.ExpenseCategoryID : -1,
            } into g
            select new
            {
                g.Key.Year,
                g.Key.Month,
                Amount = g.Sum(e => e.Amount),
                g.Key.ExpenseCategoryID,
            }
        )
            .AsEnumerable()
            .Select(g =>
            {
                DateOnly monthStart = new(g.Year, g.Month, 1);
                DateOnly monthEnd = monthStart.AddMonths(1).AddDays(-1);
                return new ExpenseSummaryPeriod
                {
                    FromDate = monthStart < fromDate ? fromDate : monthStart,
                    ToDate = monthEnd > toDate ? toDate : monthEnd,
                    Amount = g.Amount,
                    ExpenseCategoryID = aggregateByExpenseCategory ? g.ExpenseCategoryID : null,
                };
            })
        .ToImmutableList();
        return new ExpenseSummary
        {
            Periods = periods,
        };
    }

    [HttpGet("templates", Name = "Get Expense Templates")]
    public ActionResult<ICollection<ExpenseTemplate>> GetExpenseTemplates(
        [BindRequired, FromQuery(Name = "fromDate")] DateOnly fromDate,
        [BindRequired, FromQuery(Name = "toDate")] DateOnly toDate,
        [BindRequired, FromQuery(Name = "groupThreshold")] int groupThreshold,
        [BindRequired, FromQuery(Name = "maxResults")] int maxResults,
        [FromQuery(Name = "aggregateByAmount")] bool aggregateByAmount,
        [FromQuery(Name = "aggregateByExpenseCategory")] bool aggregateByExpenseCategory,
        [FromQuery(Name = "aggregateByPaymentMethod")] bool aggregateByPaymentMethod,
        [FromQuery(Name = "aggregateByVendor")] bool aggregateByVendor
    )
    {
        if (!aggregateByAmount && !aggregateByExpenseCategory && !aggregateByPaymentMethod && !aggregateByVendor)
        {
            return BadRequest("At least one aggregation option must be specified.");
        }
        if (groupThreshold < 1)
        {
            return BadRequest("Group threshold must be greater than or equal to 1.");
        }
        if (maxResults > 20)
        {
            return BadRequest("Max results must be less than or equal to 20.");
        }
        return (
            from expense in _context.Expenses
            where expense.Date >= fromDate
            where expense.Date <= toDate
            group expense by new
            {
                Amount = aggregateByAmount ? expense.Amount : -1,
                ExpenseCategoryID = aggregateByExpenseCategory ? expense.ExpenseCategoryID : -1,
                PaymentMethodId = aggregateByPaymentMethod ? expense.PaymentMethodID : -1,
                VendorId = aggregateByVendor ? expense.VendorID : -1,
            } into g
            select new
            {
                g.Key.Amount,
                g.Key.ExpenseCategoryID,
                g.Key.PaymentMethodId,
                g.Key.VendorId,
                Total = g.Count()
            }
        )
            .Where(g => g.Total > groupThreshold)
            .OrderByDescending(g => g.Total)
            .Take(maxResults)
            .Select(g => 
                new ExpenseTemplate
                {
                    Amount = aggregateByAmount ? g.Amount : null,
                    ExpenseCategoryID = aggregateByExpenseCategory ? g.ExpenseCategoryID : null,
                    PaymentMethodID = aggregateByPaymentMethod ? g.PaymentMethodId : null,
                    VendorID = aggregateByVendor ? g.VendorId : null,
                }
            )
            .ToImmutableList();
    }
}
