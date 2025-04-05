using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("expenses", Name = "Expense API")]
[ApiController]
public class ExpenseApiController : ControllerBase
{
    private readonly BudgetDbContext _context;

    public ExpenseApiController(BudgetDbContext context)
    {
        _context = context;
    }

    [HttpGet(Name = "Get Expenses")]
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

    [HttpPost(Name = "Create Expense")]
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

    [HttpPut("{expenseId}", Name = "Update Expense")]
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

    [HttpDelete("{expenseId}", Name = "Delete Expense")]
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
}
