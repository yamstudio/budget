namespace YamStudio.Budget.WebApi.Models;

/// <summary>One aggregated amount: a group (id and name) and, when requested by month, the first day of that month.</summary>
public class BreakdownRow
{
    public required int Key { get; set; }
    public required string Label { get; set; }
    public DateOnly? Month { get; set; }
    public required decimal Amount { get; set; }
}
