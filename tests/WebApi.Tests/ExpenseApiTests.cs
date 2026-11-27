using System.Net;
using System.Net.Http.Json;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Tests;

public class ExpenseApiTests(ApiFixture api) : ApiTestBase(api)
{
    [Fact]
    public async Task Create_read_update_delete_roundtrip()
    {
        var (category, vendor, method) = await CreateLookupsAsync();
        var created = await CreateExpenseAsync(category, vendor, method, 12.34m, "2002-03-04", "lunch");
        Assert.True(created.ExpenseID > 0);

        var listed = await Client.GetFromJsonAsync<List<Expense>>("/api/expenses?fromDate=2002-03-01&toDate=2002-03-31");
        var stored = Assert.Single(listed!, e => e.ExpenseID == created.ExpenseID);
        Assert.Equal(12.34m, stored.Amount);
        Assert.Equal(new DateOnly(2002, 3, 4), stored.Date);
        Assert.Equal("lunch", stored.Note);

        var update = await Client.PutAsJsonAsync($"/api/expenses/{created.ExpenseID}", new
        {
            expenseCategoryID = category,
            vendorID = vendor,
            paymentMethodID = method,
            amount = 99.99m,
            date = "2002-03-05",
            note = "dinner",
        });
        update.EnsureSuccessStatusCode();
        var returned = await update.Content.ReadFromJsonAsync<Expense>();
        Assert.Equal(created.ExpenseID, returned!.ExpenseID);
        Assert.Equal(99.99m, returned.Amount);
        listed = await Client.GetFromJsonAsync<List<Expense>>("/api/expenses?fromDate=2002-03-01&toDate=2002-03-31");
        stored = Assert.Single(listed!, e => e.ExpenseID == created.ExpenseID);
        Assert.Equal(99.99m, stored.Amount);
        Assert.Equal(new DateOnly(2002, 3, 5), stored.Date);
        Assert.Equal("dinner", stored.Note);

        var delete = await Client.DeleteAsync($"/api/expenses/{created.ExpenseID}");
        delete.EnsureSuccessStatusCode();
        listed = await Client.GetFromJsonAsync<List<Expense>>("/api/expenses?fromDate=2002-03-01&toDate=2002-03-31");
        Assert.DoesNotContain(listed!, e => e.ExpenseID == created.ExpenseID);
    }

    [Fact]
    public async Task List_only_returns_expenses_inside_the_date_range_inclusive()
    {
        var (category, vendor, method) = await CreateLookupsAsync();
        await CreateExpenseAsync(category, vendor, method, 1m, "2004-05-09");
        var first = await CreateExpenseAsync(category, vendor, method, 2m, "2004-05-10");
        var last = await CreateExpenseAsync(category, vendor, method, 3m, "2004-05-20");
        await CreateExpenseAsync(category, vendor, method, 4m, "2004-05-21");

        var listed = await Client.GetFromJsonAsync<List<Expense>>("/api/expenses?fromDate=2004-05-10&toDate=2004-05-20");
        Assert.Equal(new[] { first.ExpenseID, last.ExpenseID }, listed!.Select(e => e.ExpenseID).Order());
    }

    [Fact]
    public async Task Update_and_delete_of_a_missing_expense_return_404()
    {
        var (category, vendor, method) = await CreateLookupsAsync();
        var update = await Client.PutAsJsonAsync("/api/expenses/2000000000", new
        {
            expenseCategoryID = category,
            vendorID = vendor,
            paymentMethodID = method,
            amount = 1m,
            date = "2002-01-01",
        });
        Assert.Equal(HttpStatusCode.NotFound, update.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.DeleteAsync("/api/expenses/2000000000")).StatusCode);
    }

    [Fact]
    public async Task List_requires_both_dates()
    {
        var response = await Client.GetAsync("/api/expenses?fromDate=2002-01-01");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Templates_group_frequent_expenses_and_validate_parameters()
    {
        var (category, vendor, method) = await CreateLookupsAsync();
        var (otherCategory, otherVendor, otherMethod) = await CreateLookupsAsync();
        for (var day = 1; day <= 3; day++)
        {
            await CreateExpenseAsync(category, vendor, method, 4.50m, $"2003-06-0{day}");
        }
        await CreateExpenseAsync(otherCategory, otherVendor, otherMethod, 9m, "2003-06-10");

        const string range = "fromDate=2003-06-01&toDate=2003-06-30&maxResults=5";
        var templates = await Client.GetFromJsonAsync<List<ExpenseTemplate>>(
            $"/api/expenses/templates?{range}&groupThreshold=2&aggregateByVendor=true&aggregateByExpenseCategory=true&aggregateByPaymentMethod=true");
        var template = Assert.Single(templates!); // only the group with more than 2 occurrences
        Assert.Equal(category, template.ExpenseCategoryID);
        Assert.Equal(vendor, template.VendorID);
        Assert.Equal(method, template.PaymentMethodID);
        Assert.Null(template.Amount);

        var none = await Client.GetAsync($"/api/expenses/templates?{range}&groupThreshold=1");
        Assert.Equal(HttpStatusCode.BadRequest, none.StatusCode); // no aggregation chosen
        var badThreshold = await Client.GetAsync($"/api/expenses/templates?{range}&groupThreshold=0&aggregateByVendor=true");
        Assert.Equal(HttpStatusCode.BadRequest, badThreshold.StatusCode);
        var tooMany = await Client.GetAsync("/api/expenses/templates?fromDate=2003-06-01&toDate=2003-06-30&maxResults=21&groupThreshold=1&aggregateByVendor=true");
        Assert.Equal(HttpStatusCode.BadRequest, tooMany.StatusCode);
    }
}
