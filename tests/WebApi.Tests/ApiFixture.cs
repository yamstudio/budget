using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;

namespace YamStudio.Budget.WebApi.Tests;

/// <summary>
/// Boots the real API against a real SQL Server, in a fresh uniquely named database created
/// from the real migrations and dropped afterwards. The server comes from the
/// ConnectionStrings__BudgetDbConnection environment variable (local: scripts/test-api.zsh,
/// CI: a service container); only its Database part is replaced. LocalDatabaseGuard still
/// applies, so this can never run against a remote database.
/// </summary>
public sealed class ApiFixture : IAsyncLifetime
{
    private const string ConnectionVariable = "ConnectionStrings__BudgetDbConnection";
    private WebApplicationFactory<Program>? _factory;
    private string? _previousValue;

    public HttpClient Client { get; private set; } = null!;
    public IServiceProvider Services => _factory!.Services;

    public ValueTask InitializeAsync()
    {
        var baseConnection = Environment.GetEnvironmentVariable(ConnectionVariable)
            ?? throw new InvalidOperationException(
                $"{ConnectionVariable} is not set. Locally use scripts/test-api.zsh; it targets the local dev DB server.");
        var builder = new SqlConnectionStringBuilder(baseConnection)
        {
            InitialCatalog = $"BudgetTest_{Guid.NewGuid():N}",
        };
        var testConnection = builder.ConnectionString;
        LocalDatabaseGuard.EnsureSafe(testConnection);

        _previousValue = baseConnection;
        Environment.SetEnvironmentVariable(ConnectionVariable, testConnection);
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b => b.UseEnvironment("Testing"));
        Client = _factory.CreateClient();

        using var scope = _factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<BudgetDbContext>().Database.Migrate();
        return ValueTask.CompletedTask;
    }

    public async ValueTask DisposeAsync()
    {
        if (_factory is not null)
        {
            using (var scope = _factory.Services.CreateScope())
            {
                await scope.ServiceProvider.GetRequiredService<BudgetDbContext>().Database.EnsureDeletedAsync();
            }
            Client.Dispose();
            await _factory.DisposeAsync();
        }
        Environment.SetEnvironmentVariable(ConnectionVariable, _previousValue);
    }
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFixture>
{
    public const string Name = "api";
}
