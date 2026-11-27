using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YamStudio.Budget.WebApi.Migrations
{
    /// <inheritdoc />
    public partial class AddExpenseCategoryNecessity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Necessity",
                table: "ExpenseCategory",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Necessity",
                table: "ExpenseCategory");
        }
    }
}
