using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.OpenApi.Models;
using YamStudio.Budget.WebApi.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
    {
        options.MapType<DateOnly>(() => new OpenApiSchema { Type = "string", Format = "date" });
    }
);
builder.Services.AddDbContext<BudgetDbContext>(
    options => options.UseSqlServer(builder.Configuration.GetConnectionString("BudgetDbConnection")));
builder.Services.AddDatabaseDeveloperPageExceptionFilter();
builder.Services.AddControllers();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

app.MapControllers();

if (app.Environment.IsDevelopment())
{
    app.MapFallbackToFile("/index.html");
    app.UseDefaultFiles();
    app.UseStaticFiles();
}
else
{
    var fileProvider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "static"));
    app.MapFallbackToFile("/index.html", new StaticFileOptions { FileProvider = fileProvider });
    app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = fileProvider });
    app.UseStaticFiles(new StaticFileOptions { FileProvider = fileProvider });
}

app.Run();