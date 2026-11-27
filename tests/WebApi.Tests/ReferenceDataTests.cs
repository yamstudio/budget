using System.Net;
using System.Net.Http.Json;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Tests;

/// <summary>The lookup tables (vendors, payment methods, categories, sources) back the management page.</summary>
public class ReferenceDataTests(ApiFixture api) : ApiTestBase(api)
{
    private async Task<int> CreateAsync(string url, string idProperty)
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var response = await Client.PostAsJsonAsync(url, new { displayName = $"ref-{suffix}", description = "test" });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty(idProperty).GetInt32();
    }

    private async Task<HttpStatusCode> DeleteAsync(string url, int id) => (await Client.DeleteAsync($"{url}/{id}")).StatusCode;

    [Theory]
    [InlineData("/api/vendors", "vendorID")]
    [InlineData("/api/payment-methods", "paymentMethodID")]
    [InlineData("/api/expense-categories", "expenseCategoryID")]
    [InlineData("/api/income-categories", "incomeCategoryID")]
    [InlineData("/api/income-sources", "incomeSourceID")]
    public async Task Unused_rows_can_be_renamed_and_deleted_and_missing_rows_return_404(string url, string idProperty)
    {
        var id = await CreateAsync(url, idProperty);

        var rename = await Client.PutAsJsonAsync($"{url}/{id}", new { displayName = "renamed", description = "changed" });
        rename.EnsureSuccessStatusCode();
        var renamed = await rename.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal("renamed", renamed.GetProperty("displayName").GetString());
        Assert.Equal("changed", renamed.GetProperty("description").GetString());

        Assert.Equal(HttpStatusCode.OK, await DeleteAsync(url, id));
        Assert.Equal(HttpStatusCode.NotFound, await DeleteAsync(url, id));
        Assert.Equal(HttpStatusCode.NotFound, (await Client.PutAsJsonAsync($"{url}/{id}", new { displayName = "x", description = "y" })).StatusCode);
    }

    [Fact]
    public async Task Deleting_a_vendor_or_payment_method_used_by_an_expense_is_refused_and_nothing_is_lost()
    {
        var (category, vendor, method) = await CreateLookupsAsync();
        var expense = await CreateExpenseAsync(category, vendor, method, 9m, "2019-04-04");

        Assert.Equal(HttpStatusCode.Conflict, await DeleteAsync("/api/vendors", vendor));
        Assert.Equal(HttpStatusCode.Conflict, await DeleteAsync("/api/payment-methods", method));
        Assert.Equal(HttpStatusCode.Conflict, await DeleteAsync("/api/expense-categories", category));

        var kept = await Client.GetFromJsonAsync<List<Expense>>("/api/expenses?fromDate=2019-04-01&toDate=2019-04-30");
        Assert.Contains(kept!, e => e.ExpenseID == expense.ExpenseID);
        Assert.Contains((await Client.GetFromJsonAsync<List<Vendor>>("/api/vendors"))!, v => v.VendorID == vendor);

        // Once the expense is gone the same rows can be deleted.
        (await Client.DeleteAsync($"/api/expenses/{expense.ExpenseID}")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, await DeleteAsync("/api/vendors", vendor));
        Assert.Equal(HttpStatusCode.OK, await DeleteAsync("/api/payment-methods", method));
        Assert.Equal(HttpStatusCode.OK, await DeleteAsync("/api/expense-categories", category));
    }

    [Fact]
    public async Task Deleting_an_expense_category_with_a_budget_is_refused()
    {
        var (category, _, _) = await CreateLookupsAsync();
        var budget = await PostAsync<Models.Budget>("/api/budgets", new { expenseCategoryID = category, amount = 100m, fromDate = "2019-01-01", toDate = "2019-12-31" });

        Assert.Equal(HttpStatusCode.Conflict, await DeleteAsync("/api/expense-categories", category));

        (await Client.DeleteAsync($"/api/budgets/{budget.BudgetID}")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, await DeleteAsync("/api/expense-categories", category));
    }

    [Fact]
    public async Task Deleting_an_income_source_or_category_used_by_an_income_is_refused()
    {
        var category = await CreateAsync("/api/income-categories", "incomeCategoryID");
        var source = await CreateAsync("/api/income-sources", "incomeSourceID");
        var income = await PostAsync<Income>("/api/incomes", new { incomeCategoryID = category, incomeSourceID = source, amount = 50m, date = "2019-05-05" });

        Assert.Equal(HttpStatusCode.Conflict, await DeleteAsync("/api/income-sources", source));
        Assert.Equal(HttpStatusCode.Conflict, await DeleteAsync("/api/income-categories", category));
        Assert.Contains((await Client.GetFromJsonAsync<List<Income>>("/api/incomes?fromDate=2019-05-01&toDate=2019-05-31"))!, i => i.IncomeID == income.IncomeID);

        (await Client.DeleteAsync($"/api/incomes/{income.IncomeID}")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, await DeleteAsync("/api/income-sources", source));
        Assert.Equal(HttpStatusCode.OK, await DeleteAsync("/api/income-categories", category));
    }
}
