using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace YamStudio.Budget.WebApi.Models;

public class Income {
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int IncomeID { get; set; }
    public int IncomeCategoryID { get; set; }
    public int IncomeSourceID { get; set; }
    [Precision(18, 2)]
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    [StringLength(512)]
    public string? Note { get; set; }

    public IncomeCategory IncomeCategory { get; set; }
    public IncomeSource IncomeSource { get; set; }
}