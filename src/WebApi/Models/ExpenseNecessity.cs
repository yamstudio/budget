using System.Text.Json.Serialization;

namespace YamStudio.Budget.WebApi.Models;

/// <summary>How optional a category's spending is. Stored as an int: append new values, never renumber.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ExpenseNecessity
{
    Unclassified = 0,
    Essential = 1,
    Discretionary = 2,
}
