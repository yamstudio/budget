using Microsoft.AspNetCore.Mvc;

namespace YamStudio.Budget.WebApi.Controller;

[Route("api")]
[ApiController]
public class ApiController : ControllerBase
{
    [HttpGet("test")]
    public string Index(int? id)
    {
        return "abc";
    }
}
