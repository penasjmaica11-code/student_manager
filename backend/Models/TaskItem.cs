using System.ComponentModel.DataAnnotations;

namespace TaskManager.Models;

public class TaskItem
{
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Course { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Priority { get; set; } = "Medium"; // Low, Medium, High

    public DateTime Deadline { get; set; }

    [Required]
    public string Status { get; set; } = "pending"; // pending, in-progress, completed

    public int UserId { get; set; }

    public User? User { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}