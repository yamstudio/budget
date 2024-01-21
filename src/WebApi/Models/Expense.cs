using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace YamStudio.Budget.WebApi.Models;

public class Expense {
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ExpenseID { get; set; }
    public int ExpenseCategoryID { get; set; }
    public int VendorID { get; set; }
    public int PaymentMethodID { get; set; }
    [Precision(18, 2)]
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    [StringLength(512)]
    public string? Note { get; set; }

    public ExpenseCategory? ExpenseCategory { get; set; }
    public Vendor? Vendor { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
}