using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("api")]
[ApiController]
public class ApiController : ControllerBase
{
    private readonly BudgetDbContext _context;

    public ApiController(BudgetDbContext context)
    {
        _context = context;
    }

    [HttpGet("expenses")]
    public async Task<ICollection<Expense>> GetExpenses()
    {
        return await _context.Expenses.ToListAsync();
    }

    [HttpGet("expense-categories")]
    public async Task<ICollection<ExpenseCategory>> GetExpenseCategories()
    {
        return await _context.ExpenseCategories.ToListAsync();
    }

    [HttpGet("incomes")]
    public async Task<ICollection<Income>> GetIncomes()
    {
        return await _context.Incomes.ToListAsync();
    }

    [HttpGet("income-categories")]
    public async Task<ICollection<IncomeCategory>> GetIncomeCategories()
    {
        return await _context.IncomeCategories.ToListAsync();
    }

    [HttpGet("income-sources")]
    public async Task<ICollection<IncomeSource>> GetIncomeSources()
    {
        return await _context.IncomeSources.ToListAsync();
    }

    [HttpGet("payment-methods")]
    public async Task<ICollection<PaymentMethod>> GetPaymentMethods()
    {
        return await _context.PaymentMethods.ToListAsync();
    }

    [HttpGet("vendors")]
    public async Task<ICollection<Vendor>> GetVendors()
    {
        return await _context.Vendors.ToListAsync();
    }
}
