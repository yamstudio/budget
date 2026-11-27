namespace YamStudio.Budget.WebApi.Models;

/// <summary>Budgeted vs. actual spending for one expense category over a date range.</summary>
public class BudgetComparisonRow
{
    public required int Key { get; set; }
    public required string Label { get; set; }
    public required decimal Budget { get; set; }
    public required decimal Actual { get; set; }
}
