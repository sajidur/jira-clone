using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Auth;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] string? userName = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? unreadOnly = null,
        [FromQuery] int limit = 50)
    {
        var targetUser = string.IsNullOrWhiteSpace(userName) ? User.GetDisplayName() : userName.Trim();

        // Find notifications for this user or addressed generally to system
        var baseQuery = _db.UserNotifications
            .Where(n => n.RecipientName.ToLower() == targetUser.ToLower() 
                     || n.RecipientEmail != null && n.RecipientEmail.ToLower() == targetUser.ToLower()
                     || n.RecipientName == "All"
                     || n.Category == "system");

        var totalUnread = await baseQuery.CountAsync(n => !n.IsRead);
        var directCount = await baseQuery.CountAsync(n => n.Category == "direct" && !n.IsRead);
        var watchingCount = await baseQuery.CountAsync(n => n.Category == "watching" && !n.IsRead);

        var query = baseQuery;

        if (unreadOnly == true)
        {
            query = query.Where(n => !n.IsRead);
        }

        if (!string.IsNullOrWhiteSpace(category) && category.ToLower() != "all")
        {
            query = query.Where(n => n.Category.ToLower() == category.ToLower());
        }

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync();

        return Ok(new
        {
            notifications,
            totalCount = notifications.Count,
            unreadCount = totalUnread,
            directCount,
            watchingCount
        });
    }

    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var notification = await _db.UserNotifications.FindAsync(id);
        if (notification == null) return NotFound();

        notification.IsRead = true;
        await _db.SaveChangesAsync();
        return Ok(notification);
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead([FromQuery] string? userName = null)
    {
        var targetUser = string.IsNullOrWhiteSpace(userName) ? User.GetDisplayName() : userName.Trim();

        var notifications = await _db.UserNotifications
            .Where(n => (n.RecipientName.ToLower() == targetUser.ToLower() || n.Category == "system") && !n.IsRead)
            .ToListAsync();

        foreach (var n in notifications)
        {
            n.IsRead = true;
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true, updatedCount = notifications.Count });
    }

    [HttpPost]
    public async Task<IActionResult> CreateNotification([FromBody] UserNotification dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new { message = "Title is required" });
        }

        dto.CreatedAt = DateTime.UtcNow;
        _db.UserNotifications.Add(dto);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetNotifications), new { id = dto.Id }, dto);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteNotification(int id)
    {
        var notification = await _db.UserNotifications.FindAsync(id);
        if (notification == null) return NotFound();

        _db.UserNotifications.Remove(notification);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("clear-all")]
    public async Task<IActionResult> ClearAll([FromQuery] string? userName = null)
    {
        var targetUser = string.IsNullOrWhiteSpace(userName) ? User.GetDisplayName() : userName.Trim();

        var notifications = await _db.UserNotifications
            .Where(n => n.RecipientName.ToLower() == targetUser.ToLower() || n.Category == "system")
            .ToListAsync();

        _db.UserNotifications.RemoveRange(notifications);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, removedCount = notifications.Count });
    }
}
