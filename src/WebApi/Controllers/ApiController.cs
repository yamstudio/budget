using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("api", Name = "Budget API")]
[ApiController]
public class ApiController : ControllerBase
{
    private readonly BudgetDbContext _context;

    public ApiController(BudgetDbContext context)
    {
        _context = context;
    }

    [HttpGet("expenses", Name = "Get Expenses")]
    public async Task<ActionResult<ICollection<Expense>>> GetExpenses(
        [BindRequired, FromQuery(Name = "fromDate")] DateOnly fromDate,
        [BindRequired, FromQuery(Name = "toDate")] DateOnly toDate
    )
    {
        return await _context.Expenses
            .Where(e => e.Date >= fromDate)
            .Where(e => e.Date <= toDate)
            .ToListAsync();
    }

    [HttpPost("expenses", Name = "Create Expense")]
    public async Task<Expense> CreateExpense(
        [Bind(
            [
                nameof(Expense.ExpenseCategoryID),
                nameof(Expense.VendorID),
                nameof(Expense.PaymentMethodID),
                nameof(Expense.Amount),
                nameof(Expense.Date),
                nameof(Expense.Note),
                nameof(Expense.ExpenseCategory),
                nameof(Expense.Vendor),
                nameof(Expense.PaymentMethod),
            ]
        )] Expense expense
    )
    {
        _context.Add(expense);
        await _context.SaveChangesAsync();
        return expense;
    }

    [HttpPut("expenses/{expenseId}", Name = "Update Expense")]
    public async Task<ActionResult<Expense>> UpdateExpense(
        int expenseId,
        [Bind(
            [
                nameof(Expense.ExpenseCategoryID),
                nameof(Expense.VendorID),
                nameof(Expense.PaymentMethodID),
                nameof(Expense.Amount),
                nameof(Expense.Date),
                nameof(Expense.Note),
            ]
        )] Expense expense
    )
    {
        var expenseToUpdate = await _context.Expenses.FirstOrDefaultAsync(e => e.ExpenseID == expenseId);
        if (expenseToUpdate == null)
        {
            return NotFound();
        }
        expenseToUpdate.ExpenseCategoryID = expense.ExpenseCategoryID;
        expenseToUpdate.VendorID = expense.VendorID;
        expenseToUpdate.PaymentMethodID = expense.PaymentMethodID;
        expenseToUpdate.Amount = expense.Amount;
        expenseToUpdate.Date = expense.Date;
        expenseToUpdate.Note = expense.Note;
        await _context.SaveChangesAsync();
        return expense;
    }

    [HttpDelete("expenses/{expenseId}", Name = "Delete Expense")]
    public async Task<ActionResult<Expense>> DeleteExpense(int expenseId)
    {
        var expenseToDelete = await _context.Expenses.FirstOrDefaultAsync(e => e.ExpenseID == expenseId);
        if (expenseToDelete == null)
        {
            return NotFound();
        }
        _context.Remove(expenseToDelete);
        await _context.SaveChangesAsync();
        return expenseToDelete;
    }

    [HttpGet("expense-categories", Name = "Get Expense Categories")]
    public async Task<ICollection<ExpenseCategory>> GetExpenseCategories()
    {
        return await _context.ExpenseCategories.ToListAsync();
    }

    [HttpPost("expense-categories", Name = "Create Expense Category")]
    public async Task<ExpenseCategory> CreateExpenseCategory(
        [Bind([nameof(ExpenseCategory.DisplayName), nameof(ExpenseCategory.Description)])] ExpenseCategory expenseCategory
    )
    {
        _context.Add(expenseCategory);
        await _context.SaveChangesAsync();
        return expenseCategory;
    }

    [HttpPut("expense-categories/{expenseCategoryId}", Name = "Update Expense Category")]
    public async Task<ActionResult<ExpenseCategory>> UpdateExpenseCategory(
        int expenseCategoryId,
        [Bind([nameof(ExpenseCategory.DisplayName), nameof(ExpenseCategory.Description)])] ExpenseCategory expenseCategory
    )
    {
        var expenseCategoryToUpdate = await _context.ExpenseCategories.FirstOrDefaultAsync(e => e.ExpenseCategoryID == expenseCategoryId);
        if (expenseCategoryToUpdate == null)
        {
            return NotFound();
        }
        expenseCategoryToUpdate.DisplayName = expenseCategory.DisplayName;
        expenseCategoryToUpdate.Description = expenseCategory.Description;
        await _context.SaveChangesAsync();
        return expenseCategory;
    }

    [HttpDelete("expense-categories/{expenseCategoryId}", Name = "Delete Expense Category")]
    public async Task<ActionResult<ExpenseCategory>> DeleteExpenseCategory(int expenseCategoryId)
    {
        var expenseCategoryToDelete = await _context.ExpenseCategories.FirstOrDefaultAsync(e => e.ExpenseCategoryID == expenseCategoryId);
        if (expenseCategoryToDelete == null)
        {
            return NotFound();
        }
        _context.Remove(expenseCategoryToDelete);
        await _context.SaveChangesAsync();
        return expenseCategoryToDelete;
    }

    [HttpGet("incomes", Name = "Get Incomes")]
    public async Task<ICollection<Income>> GetIncomes(
        [BindRequired, FromQuery(Name = "fromDate")] DateOnly fromDate,
        [BindRequired, FromQuery(Name = "toDate")] DateOnly toDate
    )
    {
        return await _context.Incomes
            .Where(income => income.Date >= fromDate)
            .Where(income => income.Date <= toDate)
            .ToListAsync();
    }

    [HttpPost("incomes", Name = "Create Income")]
    public async Task<Income> CreateIncome(
        [Bind(
            [
                nameof(Income.IncomeCategoryID),
                nameof(Income.IncomeSourceID),
                nameof(Income.Amount),
                nameof(Income.Date),
                nameof(Income.Note),
                nameof(Income.IncomeCategory),
                nameof(Income.IncomeSource)
            ]
        )] Income income
    )
    {
        _context.Add(income);
        await _context.SaveChangesAsync();
        return income;
    }

    [HttpPut("incomes/{incomeId}", Name = "Update Income")]
    public async Task<ActionResult<Income>> UpdateIncome(
        int incomeId,
        [Bind(
            [
                nameof(Income.IncomeCategoryID),
                nameof(Income.IncomeSourceID),
                nameof(Income.Amount),
                nameof(Income.Date),
                nameof(Income.Note)
            ]
        )] Income income
    )
    {
        var incomeToUpdate = await _context.Incomes.FirstOrDefaultAsync(e => e.IncomeID == incomeId);
        if (incomeToUpdate == null)
        {
            return NotFound();
        }
        incomeToUpdate.IncomeCategoryID = income.IncomeCategoryID;
        incomeToUpdate.IncomeSourceID = income.IncomeSourceID;
        incomeToUpdate.Amount = income.Amount;
        incomeToUpdate.Date = income.Date;
        incomeToUpdate.Note = income.Note;
        await _context.SaveChangesAsync();
        return income;
    }

    [HttpDelete("incomes/{incomeId}", Name = "Delete Income")]
    public async Task<ActionResult<Income>> DeleteIncome(int incomeId)
    {
        var incomeToDelete = await _context.Incomes.FirstOrDefaultAsync(e => e.IncomeID == incomeId);
        if (incomeToDelete == null)
        {
            return NotFound();
        }
        _context.Remove(incomeToDelete);
        await _context.SaveChangesAsync();
        return incomeToDelete;
    }

    [HttpGet("income-categories", Name = "Get Income Categories")]
    public async Task<ICollection<IncomeCategory>> GetIncomeCategories()
    {
        return await _context.IncomeCategories.ToListAsync();
    }

    [HttpPost("income-categories", Name = "Create Income Category")]
    public async Task<IncomeCategory> CreateIncomeCategory(
        [Bind([nameof(IncomeCategory.DisplayName), nameof(IncomeCategory.Description)])] IncomeCategory incomeCategory
    )
    {
        _context.Add(incomeCategory);
        await _context.SaveChangesAsync();
        return incomeCategory;
    }

    [HttpPut("income-categories/{incomeCategoryId}", Name = "Update Income Category")]
    public async Task<ActionResult<IncomeCategory>> UpdateIncomeCategory(
        int incomeCategoryId,
        [Bind([nameof(IncomeCategory.DisplayName), nameof(IncomeCategory.Description)])] IncomeCategory incomeCategory
    )
    {
        var incomeCategoryToUpdate = await _context.IncomeCategories.FirstOrDefaultAsync(e => e.IncomeCategoryID == incomeCategoryId);
        if (incomeCategoryToUpdate == null)
        {
            return NotFound();
        }
        incomeCategoryToUpdate.DisplayName = incomeCategory.DisplayName;
        incomeCategoryToUpdate.Description = incomeCategory.Description;
        await _context.SaveChangesAsync();
        return incomeCategory;
    }

    [HttpDelete("income-categories/{incomeCategoryId}", Name = "Delete Income Category")]
    public async Task<ActionResult<IncomeCategory>> DeleteIncomeCategory(int incomeCategoryId)
    {
        var incomeCategoryToDelete = await _context.IncomeCategories.FirstOrDefaultAsync(e => e.IncomeCategoryID == incomeCategoryId);
        if (incomeCategoryToDelete == null)
        {
            return NotFound();
        }
        _context.Remove(incomeCategoryToDelete);
        await _context.SaveChangesAsync();
        return incomeCategoryToDelete;
    }

    [HttpGet("income-sources", Name = "Get Income Sources")]
    public async Task<ICollection<IncomeSource>> GetIncomeSources()
    {
        return await _context.IncomeSources.ToListAsync();
    }

    [HttpPost("income-sources", Name = "Create Income Source")]
    public async Task<IncomeSource> CreateIncomeSource(
        [Bind([nameof(IncomeSource.DisplayName), nameof(IncomeSource.Description)])] IncomeSource incomeSource
    )
    {
        _context.Add(incomeSource);
        await _context.SaveChangesAsync();
        return incomeSource;
    }

    [HttpPut("income-sources/{incomeSourceId}", Name = "Update Income Source")]
    public async Task<ActionResult<IncomeSource>> UpdateIncomeSource(
        int incomeSourceId,
        [Bind([nameof(IncomeSource.DisplayName), nameof(IncomeSource.Description)])] IncomeSource incomeSource
    )
    {
        var incomeSourceToUpdate = await _context.IncomeSources.FirstOrDefaultAsync(e => e.IncomeSourceID == incomeSourceId);
        if (incomeSourceToUpdate == null)
        {
            return NotFound();
        }
        incomeSourceToUpdate.DisplayName = incomeSource.DisplayName;
        incomeSourceToUpdate.Description = incomeSource.Description;
        await _context.SaveChangesAsync();
        return incomeSource;
    }

    [HttpDelete("income-sources/{incomeSourceId}", Name = "Delete Income Source")]
    public async Task<ActionResult<IncomeSource>> DeleteIncomeSource(int incomeSourceId)
    {
        var incomeSourceToDelete = await _context.IncomeSources.FirstOrDefaultAsync(e => e.IncomeSourceID == incomeSourceId);
        if (incomeSourceToDelete == null)
        {
            return NotFound();
        }
        _context.Remove(incomeSourceToDelete);
        await _context.SaveChangesAsync();
        return incomeSourceToDelete;
    }

    [HttpGet("payment-methods", Name = "Get Payment Methods")]
    public async Task<ICollection<PaymentMethod>> GetPaymentMethods()
    {
        return await _context.PaymentMethods.ToListAsync();
    }

    [HttpPost("payment-methods", Name = "Create Payment Method")]
    public async Task<PaymentMethod> CreatePaymentMethod(
        [Bind([nameof(PaymentMethod.DisplayName), nameof(PaymentMethod.Description)])] PaymentMethod paymentMethod
    )
    {
        _context.Add(paymentMethod);
        await _context.SaveChangesAsync();
        return paymentMethod;
    }

    [HttpPut("payment-methods/{paymentMethodId}", Name = "Update Payment Method")]
    public async Task<ActionResult<PaymentMethod>> UpdatePaymentMethod(
        int paymentMethodId,
        [Bind([nameof(PaymentMethod.DisplayName), nameof(PaymentMethod.Description)])] PaymentMethod paymentMethod
    )
    {
        var paymentMethodToUpdate = await _context.PaymentMethods.FirstOrDefaultAsync(e => e.PaymentMethodID == paymentMethodId);
        if (paymentMethodToUpdate == null)
        {
            return NotFound();
        }
        paymentMethodToUpdate.DisplayName = paymentMethod.DisplayName;
        paymentMethodToUpdate.Description = paymentMethod.Description;
        await _context.SaveChangesAsync();
        return paymentMethod;
    }

    [HttpDelete("payment-methods/{paymentMethodId}", Name = "Delete Payment Method")]
    public async Task<ActionResult<PaymentMethod>> DeletePaymentMethod(int paymentMethodId)
    {
        var paymentMethodToDelete = await _context.PaymentMethods.FirstOrDefaultAsync(e => e.PaymentMethodID == paymentMethodId);
        if (paymentMethodToDelete == null)
        {
            return NotFound();
        }
        _context.Remove(paymentMethodToDelete);
        await _context.SaveChangesAsync();
        return paymentMethodToDelete;
    }

    [HttpGet("vendors", Name = "Get Vendors")]
    public async Task<ICollection<Vendor>> GetVendors()
    {
        return await _context.Vendors.ToListAsync();
    }

    [HttpPost("vendors", Name = "Create Vendor")]
    public async Task<Vendor> CreateVendor(
        [Bind([nameof(Vendor.DisplayName), nameof(Vendor.Description)])] Vendor vendor
    )
    {
        _context.Add(vendor);
        await _context.SaveChangesAsync();
        return vendor;
    }

    [HttpPut("vendors/{vendorId}", Name = "Update Vendor")]
    public async Task<ActionResult<Vendor>> UpdateVendor(
        int vendorId,
        [Bind([nameof(Vendor.DisplayName), nameof(Vendor.Description)])] Vendor vendor
    )
    {
        var vendorToUpdate = await _context.Vendors.FirstOrDefaultAsync(e => e.VendorID == vendorId);
        if (vendorToUpdate == null)
        {
            return NotFound();
        }
        vendorToUpdate.DisplayName = vendor.DisplayName;
        vendorToUpdate.Description = vendor.Description;
        await _context.SaveChangesAsync();
        return vendor;
    }

    [HttpDelete("vendors/{vendorId}", Name = "Delete Vendor")]
    public async Task<ActionResult<Vendor>> DeleteVendor(int vendorId)
    {
        var vendorToDelete = await _context.Vendors.FirstOrDefaultAsync(e => e.VendorID == vendorId);
        if (vendorToDelete == null)
        {
            return NotFound();
        }
        _context.Remove(vendorToDelete);
        await _context.SaveChangesAsync();
        return vendorToDelete;
    }

    [HttpGet("budgets", Name = "Get Budgets")]
    public async Task<ICollection<Models.Budget>> GetBudgets()
    {
        return await _context.Budgets.ToListAsync();
    }

    [HttpPost("budgets", Name = "Create Budget")]
    public async Task<Models.Budget> CreateBudget(
        [Bind(
            [
                nameof(Models.Budget.Amount),
                nameof(Models.Budget.FromDate),
                nameof(Models.Budget.ToDate),
                nameof(Models.Budget.ExpenseCategoryID)
            ]
        )] Models.Budget budget
    )
    {
        _context.Add(budget);
        await _context.SaveChangesAsync();
        return budget;
    }

    [HttpPut("budgets/{budgetId}", Name = "Update Budget")]
    public async Task<ActionResult<Models.Budget>> UpdateBudget(
        int budgetId,
        [Bind(
            [
                nameof(Models.Budget.Amount),
                nameof(Models.Budget.FromDate),
                nameof(Models.Budget.ToDate),
                nameof(Models.Budget.ExpenseCategoryID)
            ]
        )] Models.Budget budget
    )
    {
        var budgetToUpdate = await _context.Budgets.FirstOrDefaultAsync(e => e.BudgetID == budgetId);
        if (budgetToUpdate == null)
        {
            return NotFound();
        }
        budgetToUpdate.Amount = budget.Amount;
        budgetToUpdate.FromDate = budget.FromDate;
        budgetToUpdate.ToDate = budget.ToDate;
        budgetToUpdate.ExpenseCategoryID = budget.ExpenseCategoryID;
        await _context.SaveChangesAsync();
        return budget;
    }

    [HttpDelete("budgets/{budgetId}", Name = "Delete Budget")]
    public async Task<ActionResult<Models.Budget>> DeleteBudget(int budgetId)
    {
        var budgetToDelete = await _context.Budgets.FirstOrDefaultAsync(e => e.BudgetID == budgetId);
        if (budgetToDelete == null)
        {
            return NotFound();
        }
        _context.Remove(budgetToDelete);
        await _context.SaveChangesAsync();
        return budgetToDelete;
    }
}
