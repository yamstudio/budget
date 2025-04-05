namespace YamStudio.Budget.WebApi.Models;

public class ExpenseSummaryPeriod {
    public required DateOnly FromDate { get; set; }
    public required DateOnly ToDate { get; set; }
    public required decimal Amount { get; set; }
    public int? ExpenseCategoryID { get; set; }
}