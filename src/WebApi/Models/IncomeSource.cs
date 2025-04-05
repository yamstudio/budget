using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YamStudio.Budget.WebApi.Models;

public class IncomeSource {
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int IncomeSourceID { get; set; }
    [StringLength(64)]
    public required string DisplayName { get; set; }
    [StringLength(256)]
    public required string Description { get; set; }
}