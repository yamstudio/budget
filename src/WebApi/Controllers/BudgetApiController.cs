using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("api/budgets", Name = "Budget API")]
[ApiController]
public class BudgetApiController : ControllerBase
{
    private readonly BudgetDbContext _context;

    public BudgetApiController(BudgetDbContext context)
    {
        _context = context;
    }

    [HttpGet(Name = "Get Budgets")]
    public async Task<ICollection<Models.Budget>> GetBudgets()
    {
        return await _context.Budgets.ToListAsync();
    }

    [HttpPost(Name = "Create Budget")]
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

    [HttpPut("{budgetId}", Name = "Update Budget")]
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

    [HttpDelete("{budgetId}", Name = "Delete Budget")]
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