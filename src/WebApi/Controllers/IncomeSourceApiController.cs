using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("api/income-sources", Name = "Income Source API")]
[ApiController]
public class IncomeSourceApiController : ControllerBase
{
    private readonly BudgetDbContext _context;

    public IncomeSourceApiController(BudgetDbContext context)
    {
        _context = context;
    }

    [HttpGet(Name = "Get Income Sources")]
    public async Task<ICollection<IncomeSource>> GetIncomeSources()
    {
        return await _context.IncomeSources.ToListAsync();
    }

    [HttpPost(Name = "Create Income Source")]
    public async Task<IncomeSource> CreateIncomeSource(
        [Bind([nameof(IncomeSource.DisplayName), nameof(IncomeSource.Description)])] IncomeSource incomeSource
    )
    {
        _context.Add(incomeSource);
        await _context.SaveChangesAsync();
        return incomeSource;
    }

    [HttpPut("{incomeSourceId}", Name = "Update Income Source")]
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
        return incomeSourceToUpdate;
    }

    [HttpDelete("{incomeSourceId}", Name = "Delete Income Source")]
    public async Task<ActionResult<IncomeSource>> DeleteIncomeSource(int incomeSourceId)
    {
        var incomeSourceToDelete = await _context.IncomeSources.FirstOrDefaultAsync(e => e.IncomeSourceID == incomeSourceId);
        if (incomeSourceToDelete == null)
        {
            return NotFound();
        }
        // The database cascades deletes, so removing a row that is still referenced would silently delete those rows too.
        if (await _context.Incomes.AnyAsync(i => i.IncomeSourceID == incomeSourceId))
        {
            return Conflict("Cannot delete an income source that is still used by incomes.");
        }
        _context.Remove(incomeSourceToDelete);
        await _context.SaveChangesAsync();
        return incomeSourceToDelete;
    }
}
