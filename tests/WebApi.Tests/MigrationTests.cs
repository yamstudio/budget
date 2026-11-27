using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;

namespace YamStudio.Budget.WebApi.Tests;

[Collection(ApiCollection.Name)]
public class MigrationTests(ApiFixture api)
{
    [Fact]
    public void All_migrations_apply_to_a_fresh_database()
    {
        // The fixture already ran Migrate() on a brand new database; this proves nothing is left over.
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BudgetDbContext>();
        Assert.Empty(db.Database.GetPendingMigrations());
        Assert.NotEmpty(db.Database.GetAppliedMigrations());
    }

    [Fact]
    public void Model_has_no_changes_missing_from_migrations()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BudgetDbContext>();
        Assert.False(db.Database.HasPendingModelChanges(),
            "The EF model differs from the latest migration snapshot. Add a migration (see docs/migrations.md).");
    }
}
