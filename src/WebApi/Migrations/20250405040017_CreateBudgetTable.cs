using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YamStudio.Budget.WebApi.Migrations
{
    /// <inheritdoc />
    public partial class CreateBudgetTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Budget",
                columns: table => new
                {
                    BudgetID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExpenseCategoryID = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    FromDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ToDate = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Budget", x => x.BudgetID);
                    table.ForeignKey(
                        name: "FK_Budget_ExpenseCategory_ExpenseCategoryID",
                        column: x => x.ExpenseCategoryID,
                        principalTable: "ExpenseCategory",
                        principalColumn: "ExpenseCategoryID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Budget_ExpenseCategoryID",
                table: "Budget",
                column: "ExpenseCategoryID");

            migrationBuilder.CreateIndex(
                name: "IX_Budget_FromDate",
                table: "Budget",
                column: "FromDate");

            migrationBuilder.CreateIndex(
                name: "IX_Budget_ToDate",
                table: "Budget",
                column: "ToDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Budget");
        }
    }
}
