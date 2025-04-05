namespace YamStudio.Budget.WebApi.Models;

public class ExpenseSummary {
    public required IList<ExpenseSummaryPeriod> Periods { get; set; }
}