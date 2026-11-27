using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("api/income-categories", Name = "Income Category API")]
[ApiController]
public class IncomeCategoryApiController : ControllerBase
{
    private readonly BudgetDbContext _context;

    public IncomeCategoryApiController(BudgetDbContext context)
    {
        _context = context;
    }

    [HttpGet(Name = "Get Income Categories")]
    public async Task<ICollection<IncomeCategory>> GetIncomeCategories()
    {
        return await _context.IncomeCategories.ToListAsync();
    }

    [HttpPost(Name = "Create Income Category")]
    public async Task<IncomeCategory> CreateIncomeCategory(
        [Bind([nameof(IncomeCategory.DisplayName), nameof(IncomeCategory.Description)])] IncomeCategory incomeCategory
    )
    {
        _context.Add(incomeCategory);
        await _context.SaveChangesAsync();
        return incomeCategory;
    }

    [HttpPut("{incomeCategoryId}", Name = "Update Income Category")]
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
        return incomeCategoryToUpdate;
    }

    [HttpDelete("{incomeCategoryId}", Name = "Delete Income Category")]
    public async Task<ActionResult<IncomeCategory>> DeleteIncomeCategory(int incomeCategoryId)
    {
        var incomeCategoryToDelete = await _context.IncomeCategories.FirstOrDefaultAsync(e => e.IncomeCategoryID == incomeCategoryId);
        if (incomeCategoryToDelete == null)
        {
            return NotFound();
        }
        // The database cascades deletes, so removing a row that is still referenced would silently delete those rows too.
        if (await _context.Incomes.AnyAsync(i => i.IncomeCategoryID == incomeCategoryId))
        {
            return Conflict("Cannot delete an income category that is still used by incomes.");
        }
        _context.Remove(incomeCategoryToDelete);
        await _context.SaveChangesAsync();
        return incomeCategoryToDelete;
    }
}
