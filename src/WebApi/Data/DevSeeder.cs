using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Data;

/// <summary>Applies migrations and inserts synthetic data into an empty LOCAL dev database.</summary>
public static class DevSeeder
{
    public static void MigrateAndSeed(BudgetDbContext db)
    {
        db.Database.Migrate();
        if (db.ExpenseCategories.Any()) return;

        var categories = new[] { "Groceries", "Rent", "Dining", "Transport", "Utilities" }
            .Select(n => new ExpenseCategory
            {
                DisplayName = n,
                Description = $"Fake {n}",
                Necessity = n == "Dining" ? ExpenseNecessity.Discretionary : ExpenseNecessity.Essential,
            }).ToList();
        var vendors = new[] { "Corner Market", "Landlord LLC", "Noodle House", "Metro", "Power Co" }
            .Select(n => new Vendor { DisplayName = n, Description = $"Fake {n}" }).ToList();
        var methods = new[] { "Credit Card", "Debit Card", "Cash" }
            .Select(n => new PaymentMethod { DisplayName = n, Description = $"Fake {n}" }).ToList();
        var incomeCategories = new[] { "Salary", "Interest" }
            .Select(n => new IncomeCategory { DisplayName = n, Description = $"Fake {n}" }).ToList();
        var incomeSources = new[] { "Employer Inc", "Savings Bank" }
            .Select(n => new IncomeSource { DisplayName = n, Description = $"Fake {n}" }).ToList();
        db.AddRange(categories); db.AddRange(vendors); db.AddRange(methods);
        db.AddRange(incomeCategories); db.AddRange(incomeSources);
        db.SaveChanges();

        var rng = new Random(42);
        var start = DateOnly.FromDateTime(DateTime.Today).AddMonths(-6);
        for (var day = 0; day < 180; day++)
        {
            var date = start.AddDays(day);
            for (var i = 0; i < rng.Next(0, 3); i++)
            {
                var k = rng.Next(categories.Count);
                db.Expenses.Add(new Expense
                {
                    ExpenseCategoryID = categories[k].ExpenseCategoryID,
                    VendorID = vendors[k].VendorID,
                    PaymentMethodID = methods[rng.Next(methods.Count)].PaymentMethodID,
                    Amount = Math.Round((decimal)(rng.NextDouble() * 80 + 5), 2),
                    Date = date,
                    Note = "Synthetic data",
                });
            }
            if (date.Day == 1 || date.Day == 15)
            {
                db.Incomes.Add(new Income
                {
                    IncomeCategoryID = incomeCategories[0].IncomeCategoryID,
                    IncomeSourceID = incomeSources[0].IncomeSourceID,
                    Amount = 2500m,
                    Date = date,
                    Note = "Synthetic data",
                });
            }
        }
        foreach (var c in categories)
        {
            db.Budgets.Add(new Models.Budget
            {
                ExpenseCategoryID = c.ExpenseCategoryID,
                Amount = 400m,
                FromDate = new DateOnly(start.Year, 1, 1),
                ToDate = new DateOnly(start.Year + 1, 12, 31),
            });
        }
        db.SaveChanges();
    }
}
