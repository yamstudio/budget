using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("api/expense-categories", Name = "Expense Category API")]
[ApiController]
public class ExpenseCategoryApiController : ControllerBase
{
    private readonly BudgetDbContext _context;

    public ExpenseCategoryApiController(BudgetDbContext context)
    {
        _context = context;
    }

    [HttpGet(Name = "Get Expense Categories")]
    public async Task<ICollection<ExpenseCategory>> GetExpenseCategories()
    {
        return await _context.ExpenseCategories.ToListAsync();
    }

    [HttpPost(Name = "Create Expense Category")]
    public async Task<ExpenseCategory> CreateExpenseCategory(
        [Bind([nameof(ExpenseCategory.DisplayName), nameof(ExpenseCategory.Description), nameof(ExpenseCategory.Necessity)])] ExpenseCategory expenseCategory
    )
    {
        _context.Add(expenseCategory);
        await _context.SaveChangesAsync();
        return expenseCategory;
    }

    [HttpPut("{expenseCategoryId}", Name = "Update Expense Category")]
    public async Task<ActionResult<ExpenseCategory>> UpdateExpenseCategory(
        int expenseCategoryId,
        [Bind([nameof(ExpenseCategory.DisplayName), nameof(ExpenseCategory.Description), nameof(ExpenseCategory.Necessity)])] ExpenseCategory expenseCategory
    )
    {
        var expenseCategoryToUpdate = await _context.ExpenseCategories.FirstOrDefaultAsync(e => e.ExpenseCategoryID == expenseCategoryId);
        if (expenseCategoryToUpdate == null)
        {
            return NotFound();
        }
        expenseCategoryToUpdate.DisplayName = expenseCategory.DisplayName;
        expenseCategoryToUpdate.Description = expenseCategory.Description;
        expenseCategoryToUpdate.Necessity = expenseCategory.Necessity;
        await _context.SaveChangesAsync();
        return expenseCategoryToUpdate;
    }

    [HttpDelete("{expenseCategoryId}", Name = "Delete Expense Category")]
    public async Task<ActionResult<ExpenseCategory>> DeleteExpenseCategory(int expenseCategoryId)
    {
        var expenseCategoryToDelete = await _context.ExpenseCategories.FirstOrDefaultAsync(e => e.ExpenseCategoryID == expenseCategoryId);
        if (expenseCategoryToDelete == null)
        {
            return NotFound();
        }
        // The database cascades deletes, so removing a row that is still referenced would silently delete those rows too.
        if (await _context.Expenses.AnyAsync(e => e.ExpenseCategoryID == expenseCategoryId) || await _context.Budgets.AnyAsync(b => b.ExpenseCategoryID == expenseCategoryId))
        {
            return Conflict("Cannot delete an expense category that is still used by expenses or budgets.");
        }
        _context.Remove(expenseCategoryToDelete);
        await _context.SaveChangesAsync();
        return expenseCategoryToDelete;
    }
}
