using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("expense-categories", Name = "Expense Category API")]
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
        [Bind([nameof(ExpenseCategory.DisplayName), nameof(ExpenseCategory.Description)])] ExpenseCategory expenseCategory
    )
    {
        _context.Add(expenseCategory);
        await _context.SaveChangesAsync();
        return expenseCategory;
    }

    [HttpPut("{expenseCategoryId}", Name = "Update Expense Category")]
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

    [HttpDelete("{expenseCategoryId}", Name = "Delete Expense Category")]
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
}