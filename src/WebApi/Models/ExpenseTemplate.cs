namespace YamStudio.Budget.WebApi.Models;

public class ExpenseTemplate {
    public int? ExpenseCategoryID { get; set; }
    public int? VendorID { get; set; }
    public int? PaymentMethodID { get; set; }
    public decimal? Amount { get; set; }
}