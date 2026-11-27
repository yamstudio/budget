using System.Net;
using System.Net.Http.Json;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Tests;

public class InsightsApiTests(ApiFixture api) : ApiTestBase(api)
{
    private Task<List<BreakdownRow>> GetRowsAsync(string url) => Client.GetFromJsonAsync<List<BreakdownRow>>(url)!;

    private async Task<int> CreateCategoryAsync(string necessity)
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var created = await PostAsync<ExpenseCategory>("/api/expense-categories", new { displayName = $"cat-{suffix}", description = "test", necessity });
        return created.ExpenseCategoryID;
    }

    [Fact]
    public async Task Category_necessity_roundtrips_as_a_string_and_defaults_to_unclassified()
    {
        var (plain, _, _) = await CreateLookupsAsync();
        var discretionary = await CreateCategoryAsync("Discretionary");
        var all = await Client.GetFromJsonAsync<List<ExpenseCategory>>("/api/expense-categories");
        Assert.Equal(ExpenseNecessity.Unclassified, all!.Single(c => c.ExpenseCategoryID == plain).Necessity);
        Assert.Equal(ExpenseNecessity.Discretionary, all!.Single(c => c.ExpenseCategoryID == discretionary).Necessity);

        var update = await Client.PutAsJsonAsync($"/api/expense-categories/{plain}", new { displayName = "renamed", description = "x", necessity = "Essential" });
        update.EnsureSuccessStatusCode();
        Assert.Equal(ExpenseNecessity.Essential, (await update.Content.ReadFromJsonAsync<ExpenseCategory>())!.Necessity);
    }

    [Fact]
    public async Task Groups_by_category_and_sums_amounts()
    {
        var (c1, vendor, method) = await CreateLookupsAsync();
        var (c2, _, _) = await CreateLookupsAsync();
        await CreateExpenseAsync(c1, vendor, method, 10m, "2010-03-01");
        await CreateExpenseAsync(c1, vendor, method, 5.5m, "2010-03-20");
        await CreateExpenseAsync(c2, vendor, method, 7m, "2010-04-02");
        await CreateExpenseAsync(c2, vendor, method, 100m, "2010-05-01"); // outside the range

        var rows = await GetRowsAsync("/api/insights/expenses?fromDate=2010-03-01&toDate=2010-04-30&groupBy=Category");
        Assert.Equal(2, rows.Count);
        Assert.Equal(15.5m, rows.Single(r => r.Key == c1).Amount);
        Assert.Equal(7m, rows.Single(r => r.Key == c2).Amount);
        Assert.All(rows, r => Assert.Null(r.Month));
        Assert.StartsWith("cat-", rows[0].Label);
        Assert.Equal(c1, rows[0].Key); // largest first
    }

    [Fact]
    public async Task By_month_splits_rows_into_months()
    {
        var (category, vendor, method) = await CreateLookupsAsync();
        await CreateExpenseAsync(category, vendor, method, 1m, "2011-03-31");
        await CreateExpenseAsync(category, vendor, method, 2m, "2011-04-01");
        await CreateExpenseAsync(category, vendor, method, 4m, "2011-04-30");

        var rows = await GetRowsAsync("/api/insights/expenses?fromDate=2011-03-01&toDate=2011-04-30&groupBy=Vendor&byMonth=true");
        Assert.Equal(2, rows.Count);
        Assert.Equal((new DateOnly(2011, 3, 1), 1m), (rows[0].Month!.Value, rows[0].Amount));
        Assert.Equal((new DateOnly(2011, 4, 1), 6m), (rows[1].Month!.Value, rows[1].Amount));
    }

    [Fact]
    public async Task Groups_by_payment_method_and_filters_by_it()
    {
        var (category, vendor, m1) = await CreateLookupsAsync();
        var (_, _, m2) = await CreateLookupsAsync();
        await CreateExpenseAsync(category, vendor, m1, 3m, "2012-06-01");
        await CreateExpenseAsync(category, vendor, m2, 8m, "2012-06-02");

        var both = await GetRowsAsync("/api/insights/expenses?fromDate=2012-06-01&toDate=2012-06-30&groupBy=PaymentMethod");
        Assert.Equal(2, both.Count);
        var only = await GetRowsAsync($"/api/insights/expenses?fromDate=2012-06-01&toDate=2012-06-30&groupBy=PaymentMethod&paymentMethodIds={m2}");
        Assert.Equal(m2, Assert.Single(only).Key);
    }

    [Fact]
    public async Task Necessity_grouping_and_filter_use_the_category_setting()
    {
        var (_, vendor, method) = await CreateLookupsAsync();
        var fixedCategory = await CreateCategoryAsync("Essential");
        var wantCategory = await CreateCategoryAsync("Discretionary");
        await CreateExpenseAsync(fixedCategory, vendor, method, 50m, "2013-01-10");
        await CreateExpenseAsync(wantCategory, vendor, method, 20m, "2013-01-11");

        var grouped = await GetRowsAsync("/api/insights/expenses?fromDate=2013-01-01&toDate=2013-01-31&groupBy=Necessity");
        Assert.Equal(50m, grouped.Single(r => r.Label == "Essential").Amount);
        Assert.Equal(20m, grouped.Single(r => r.Label == "Discretionary").Amount);

        var filtered = await GetRowsAsync("/api/insights/expenses?fromDate=2013-01-01&toDate=2013-01-31&groupBy=Category&necessities=Discretionary");
        Assert.Equal(wantCategory, Assert.Single(filtered).Key);
    }

    [Fact]
    public async Task Category_and_vendor_filters_combine()
    {
        var (c1, v1, method) = await CreateLookupsAsync();
        var (c2, v2, _) = await CreateLookupsAsync();
        await CreateExpenseAsync(c1, v1, method, 1m, "2014-02-01");
        await CreateExpenseAsync(c1, v2, method, 2m, "2014-02-02");
        await CreateExpenseAsync(c2, v1, method, 4m, "2014-02-03");

        var rows = await GetRowsAsync($"/api/insights/expenses?fromDate=2014-02-01&toDate=2014-02-28&groupBy=Vendor&expenseCategoryIds={c1}&vendorIds={v1}");
        var row = Assert.Single(rows);
        Assert.Equal((v1, 1m), (row.Key, row.Amount));
    }

    [Fact]
    public async Task Income_breakdown_groups_by_source_and_category()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var category = (await PostAsync<IncomeCategory>("/api/income-categories", new { displayName = $"ic-{suffix}", description = "t" })).IncomeCategoryID;
        var s1 = (await PostAsync<IncomeSource>("/api/income-sources", new { displayName = $"is1-{suffix}", description = "t" })).IncomeSourceID;
        var s2 = (await PostAsync<IncomeSource>("/api/income-sources", new { displayName = $"is2-{suffix}", description = "t" })).IncomeSourceID;
        foreach (var (source, amount, date) in new[] { (s1, 1000m, "2015-07-01"), (s1, 500m, "2015-07-15"), (s2, 30m, "2015-07-20") })
        {
            await PostAsync<Income>("/api/incomes", new { incomeCategoryID = category, incomeSourceID = source, amount, date });
        }

        var bySource = await GetRowsAsync("/api/insights/incomes?fromDate=2015-07-01&toDate=2015-07-31&groupBy=Source");
        Assert.Equal(1500m, bySource.Single(r => r.Key == s1).Amount);
        Assert.Equal(30m, bySource.Single(r => r.Key == s2).Amount);
        var byCategory = await GetRowsAsync("/api/insights/incomes?fromDate=2015-07-01&toDate=2015-07-31&groupBy=Category");
        Assert.Equal(1530m, Assert.Single(byCategory).Amount);
    }

    [Fact]
    public async Task Bad_requests_are_rejected()
    {
        Assert.Equal(HttpStatusCode.BadRequest, (await Client.GetAsync("/api/insights/expenses?fromDate=2010-01-01&toDate=2010-01-31")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Client.GetAsync("/api/insights/expenses?fromDate=2010-02-01&toDate=2010-01-31&groupBy=Category")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Client.GetAsync("/api/insights/incomes?fromDate=2010-01-01&toDate=2010-01-31&groupBy=Nope")).StatusCode);
    }
}
