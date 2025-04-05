using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YamStudio.Budget.WebApi.Data;
using YamStudio.Budget.WebApi.Models;

namespace YamStudio.Budget.WebApi.Controllers;

[Route("api/vendors", Name = "Vendor API")]
[ApiController]
public class VendorApiController : ControllerBase
{
    private readonly BudgetDbContext _context;

    public VendorApiController(BudgetDbContext context)
    {
        _context = context;
    }

    [HttpGet(Name = "Get Vendors")]
    public async Task<ICollection<Vendor>> GetVendors()
    {
        return await _context.Vendors.ToListAsync();
    }

    [HttpPost(Name = "Create Vendor")]
    public async Task<Vendor> CreateVendor(
        [Bind([nameof(Vendor.DisplayName), nameof(Vendor.Description)])] Vendor vendor
    )
    {
        _context.Add(vendor);
        await _context.SaveChangesAsync();
        return vendor;
    }

    [HttpPut("{vendorId}", Name = "Update Vendor")]
    public async Task<ActionResult<Vendor>> UpdateVendor(
        int vendorId,
        [Bind([nameof(Vendor.DisplayName), nameof(Vendor.Description)])] Vendor vendor
    )
    {
        var vendorToUpdate = await _context.Vendors.FirstOrDefaultAsync(e => e.VendorID == vendorId);
        if (vendorToUpdate == null)
        {
            return NotFound();
        }
        vendorToUpdate.DisplayName = vendor.DisplayName;
        vendorToUpdate.Description = vendor.Description;
        await _context.SaveChangesAsync();
        return vendor;
    }

    [HttpDelete("{vendorId}", Name = "Delete Vendor")]
    public async Task<ActionResult<Vendor>> DeleteVendor(int vendorId)
    {
        var vendorToDelete = await _context.Vendors.FirstOrDefaultAsync(e => e.VendorID == vendorId);
        if (vendorToDelete == null)
        {
            return NotFound();
        }
        _context.Remove(vendorToDelete);
        await _context.SaveChangesAsync();
        return vendorToDelete;
    }
}