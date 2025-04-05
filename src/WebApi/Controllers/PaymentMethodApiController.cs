using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("payment-methods", Name = "Payment Method API")]
[ApiController]
public class PaymentMethodApiController : ControllerBase
{
    private readonly BudgetDbContext _context;

    public PaymentMethodApiController(BudgetDbContext context)
    {
        _context = context;
    }

    [HttpGet(Name = "Get Payment Methods")]
    public async Task<ICollection<PaymentMethod>> GetPaymentMethods()
    {
        return await _context.PaymentMethods.ToListAsync();
    }

    [HttpPost(Name = "Create Payment Method")]
    public async Task<PaymentMethod> CreatePaymentMethod(
        [Bind([nameof(PaymentMethod.DisplayName), nameof(PaymentMethod.Description)])] PaymentMethod paymentMethod
    )
    {
        _context.Add(paymentMethod);
        await _context.SaveChangesAsync();
        return paymentMethod;
    }

    [HttpPut("{paymentMethodId}", Name = "Update Payment Method")]
    public async Task<ActionResult<PaymentMethod>> UpdatePaymentMethod(
        int paymentMethodId,
        [Bind([nameof(PaymentMethod.DisplayName), nameof(PaymentMethod.Description)])] PaymentMethod paymentMethod
    )
    {
        var paymentMethodToUpdate = await _context.PaymentMethods.FirstOrDefaultAsync(e => e.PaymentMethodID == paymentMethodId);
        if (paymentMethodToUpdate == null)
        {
            return NotFound();
        }
        paymentMethodToUpdate.DisplayName = paymentMethod.DisplayName;
        paymentMethodToUpdate.Description = paymentMethod.Description;
        await _context.SaveChangesAsync();
        return paymentMethod;
    }

    [HttpDelete("{paymentMethodId}", Name = "Delete Payment Method")]
    public async Task<ActionResult<PaymentMethod>> DeletePaymentMethod(int paymentMethodId)
    {
        var paymentMethodToDelete = await _context.PaymentMethods.FirstOrDefaultAsync(e => e.PaymentMethodID == paymentMethodId);
        if (paymentMethodToDelete == null)
        {
            return NotFound();
        }
        _context.Remove(paymentMethodToDelete);
        await _context.SaveChangesAsync();
        return paymentMethodToDelete;
    }
}