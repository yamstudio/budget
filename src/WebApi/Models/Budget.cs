using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace YamStudio.Budget.WebApi.Models;

[Index(nameof(FromDate))]
[Index(nameof(ToDate))]
public class Budget {
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int BudgetID { get; set; }
    public int ExpenseCategoryID { get; set; }
    [Precision(18, 2)]
    public decimal Amount { get; set; }
    public required DateOnly FromDate { get; set; }
    public required DateOnly ToDate { get; set; }

    public ExpenseCategory? ExpenseCategory { get; set; }
}