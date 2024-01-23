using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YamStudio.Budget.WebApi.Migrations
{
    /// <inheritdoc />
    public partial class DateIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Income_Date",
                table: "Income",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Expense_Date",
                table: "Expense",
                column: "Date");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Income_Date",
                table: "Income");

            migrationBuilder.DropIndex(
                name: "IX_Expense_Date",
                table: "Expense");
        }
    }
}
