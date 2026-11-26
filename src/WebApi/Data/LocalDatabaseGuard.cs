using Microsoft.Data.SqlClient;

namespace YamStudio.Budget.WebApi.Data;

/// <summary>
/// Refuses to start against a non-local database unless running on Azure App Service
/// or explicitly overridden. This protects production data from local runs, tests and
/// `dotnet ef` commands. The override is BUDGET_ALLOW_REMOTE_DB=1; see docs/migrations.md.
/// </summary>
public static class LocalDatabaseGuard
{
    private static readonly string[] LocalHosts = ["localhost", "127.0.0.1", "::1", "(local)", "."];

    /// <returns>true if the database is local.</returns>
    public static bool EnsureSafe(string? connectionString)
    {
        var dataSource = new SqlConnectionStringBuilder(connectionString ?? "").DataSource;
        var host = dataSource.Split(',')[0].Trim();
        if (host.StartsWith("tcp:", StringComparison.OrdinalIgnoreCase)) host = host[4..];
        var isLocal = LocalHosts.Contains(host, StringComparer.OrdinalIgnoreCase);

        var onAppService = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME"));
        var overridden = Environment.GetEnvironmentVariable("BUDGET_ALLOW_REMOTE_DB") == "1";
        if (!isLocal && !onAppService && !overridden)
        {
            throw new InvalidOperationException(
                "Refusing to use a non-local database outside Azure App Service. " +
                "Run scripts/dev-api.zsh to use the local dev DB (see CLAUDE.md and docs/migrations.md).");
        }
        return isLocal;
    }
}
