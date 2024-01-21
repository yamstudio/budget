using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YamStudio.Budget.WebApi.Models;

public class ExpenseCategory {
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ExpenseCategoryID { get; set; }
    [StringLength(64)]
    public string DisplayName { get; set; }
    [StringLength(256)]
    public string Description { get; set; }
    
}