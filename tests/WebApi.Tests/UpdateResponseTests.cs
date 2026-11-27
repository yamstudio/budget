using System.Net.Http.Json;
using System.Text.Json;

namespace YamStudio.Budget.WebApi.Tests;

/// <summary>
/// PUT must return the stored row (with its real id). The UI patches its caches by that id, so a
/// response with id 0 leaves stale data behind.
/// </summary>
public class UpdateResponseTests(ApiFixture api) : ApiTestBase(api)
{
    [Theory]
    [InlineData("/api/vendors", "vendorID")]
    [InlineData("/api/expense-categories", "expenseCategoryID")]
    [InlineData("/api/payment-methods", "paymentMethodID")]
    [InlineData("/api/income-categories", "incomeCategoryID")]
    [InlineData("/api/income-sources", "incomeSourceID")]
    public async Task Lookup_update_returns_the_stored_row(string route, string idProperty)
    {
        var created = await PostAsync<JsonElement>(route, new { displayName = "before", description = "d" });
        var id = created.GetProperty(idProperty).GetInt32();
        Assert.True(id > 0);

        var response = await Client.PutAsJsonAsync($"{route}/{id}", new { displayName = "after", description = "d2" });
        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(id, updated.GetProperty(idProperty).GetInt32());
        Assert.Equal("after", updated.GetProperty("displayName").GetString());
        Assert.Equal("d2", updated.GetProperty("description").GetString());
    }

    [Fact]
    public async Task Income_update_returns_the_stored_row()
    {
        var category = await PostAsync<JsonElement>("/api/income-categories", new { displayName = "c", description = "d" });
        var source = await PostAsync<JsonElement>("/api/income-sources", new { displayName = "s", description = "d" });
        var categoryId = category.GetProperty("incomeCategoryID").GetInt32();
        var sourceId = source.GetProperty("incomeSourceID").GetInt32();
        var created = await PostAsync<JsonElement>("/api/incomes", new
        {
            incomeCategoryID = categoryId,
            incomeSourceID = sourceId,
            amount = 100m,
            date = "2005-01-01",
            note = "before",
        });
        var id = created.GetProperty("incomeID").GetInt32();

        var response = await Client.PutAsJsonAsync($"/api/incomes/{id}", new
        {
            incomeCategoryID = categoryId,
            incomeSourceID = sourceId,
            amount = 250.5m,
            date = "2005-01-02",
            note = "after",
        });
        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(id, updated.GetProperty("incomeID").GetInt32());
        Assert.Equal(250.5m, updated.GetProperty("amount").GetDecimal());
        Assert.Equal("2005-01-02", updated.GetProperty("date").GetString());
        Assert.Equal("after", updated.GetProperty("note").GetString());
    }

    [Fact]
    public async Task Budget_update_returns_the_stored_row()
    {
        var category = await PostAsync<JsonElement>("/api/expense-categories", new { displayName = "b", description = "d" });
        var categoryId = category.GetProperty("expenseCategoryID").GetInt32();
        var created = await PostAsync<JsonElement>("/api/budgets", new
        {
            expenseCategoryID = categoryId,
            amount = 100m,
            fromDate = "2006-01-01",
            toDate = "2006-12-31",
        });
        var id = created.GetProperty("budgetID").GetInt32();

        var response = await Client.PutAsJsonAsync($"/api/budgets/{id}", new
        {
            expenseCategoryID = categoryId,
            amount = 300m,
            fromDate = "2006-02-01",
            toDate = "2006-11-30",
        });
        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(id, updated.GetProperty("budgetID").GetInt32());
        Assert.Equal(300m, updated.GetProperty("amount").GetDecimal());
        Assert.Equal("2006-02-01", updated.GetProperty("fromDate").GetString());
    }
}
