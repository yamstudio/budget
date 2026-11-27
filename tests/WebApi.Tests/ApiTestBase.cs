using System.Net.Http.Json;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Tests;

/// <summary>Shared helpers. Tests own their data: each uses its own date range and fresh lookup rows.</summary>
[Collection(ApiCollection.Name)]
public abstract class ApiTestBase(ApiFixture api)
{
    protected HttpClient Client => api.Client;

    protected async Task<T> PostAsync<T>(string url, object body)
    {
        var response = await Client.PostAsJsonAsync(url, body);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    protected async Task<(int categoryId, int vendorId, int methodId)> CreateLookupsAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var category = await PostAsync<ExpenseCategory>("/api/expense-categories", new { displayName = $"cat-{suffix}", description = "test" });
        var vendor = await PostAsync<Vendor>("/api/vendors", new { displayName = $"vendor-{suffix}", description = "test" });
        var method = await PostAsync<PaymentMethod>("/api/payment-methods", new { displayName = $"pay-{suffix}", description = "test" });
        return (category.ExpenseCategoryID, vendor.VendorID, method.PaymentMethodID);
    }

    protected Task<Expense> CreateExpenseAsync(int categoryId, int vendorId, int methodId, decimal amount, string date, string? note = null) =>
        PostAsync<Expense>("/api/expenses", new
        {
            expenseCategoryID = categoryId,
            vendorID = vendorId,
            paymentMethodID = methodId,
            amount,
            date,
            note,
        });
}
