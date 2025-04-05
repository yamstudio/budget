using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("incomes", Name = "Income API")]
[ApiController]
public class IncomeApiController : ControllerBase
{
    private readonly BudgetDbContext _context;

    public IncomeApiController(BudgetDbContext context)
    {
        _context = context;
    }

    [HttpGet(Name = "Get Incomes")]
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

    [HttpPost(Name = "Create Income")]
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

    [HttpPut("{incomeId}", Name = "Update Income")]
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

    [HttpDelete("{incomeId}", Name = "Delete Income")]
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
}