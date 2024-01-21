using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Data;

public class BudgetDbContext : DbContext {
        public BudgetDbContext(DbContextOptions<BudgetDbContext> options) : base(options)
        {
        }

        public DbSet<Expense> Expenses { get; set; }
        public DbSet<ExpenseCategory> ExpenseCategories { get; set; }
        public DbSet<Income> Incomes { get; set; }
        public DbSet<IncomeCategory> IncomeCategories { get; set; }
        public DbSet<IncomeSource> IncomeSources { get; set; }
        public DbSet<PaymentMethod> PaymentMethods { get; set; }
        public DbSet<Vendor> Vendors { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Expense>().ToTable("Expense");
            modelBuilder.Entity<ExpenseCategory>().ToTable("ExpenseCategory");
            modelBuilder.Entity<Income>().ToTable("Income");
            modelBuilder.Entity<IncomeCategory>().ToTable("IncomeCategory");
            modelBuilder.Entity<IncomeSource>().ToTable("IncomeSource");
            modelBuilder.Entity<PaymentMethod>().ToTable("PaymentMethod");
            modelBuilder.Entity<Vendor>().ToTable("Vendor");
        }
}