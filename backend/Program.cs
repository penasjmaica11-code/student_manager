using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManager.Data;
using TaskManager.Models;
using System.Security.Cryptography;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<TaskManagerContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=taskmanager.db"));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

var app = builder.Build();

// Create database if it doesn't exist
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TaskManagerContext>();
    db.Database.EnsureCreated();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

// Auth endpoints
app.MapPost("/api/auth/register", async (RegisterRequest request, TaskManagerContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email) ||
        string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.StudentNumber) ||
        string.IsNullOrWhiteSpace(request.Major))
    {
        return Results.BadRequest("All fields are required");
    }

    if (await db.Users.AnyAsync(u => u.Username == request.Username))
    {
        return Results.BadRequest("Username already exists");
    }

    if (await db.Users.AnyAsync(u => u.Email == request.Email))
    {
        return Results.BadRequest("Email already exists");
    }

    if (await db.Users.AnyAsync(u => u.StudentNumber == request.StudentNumber))
    {
        return Results.BadRequest("Student number already exists");
    }

    var passwordHash = HashPassword(request.Password);
    var user = new User
    {
        Username = request.Username,
        Email = request.Email,
        StudentNumber = request.StudentNumber,
        Major = request.Major,
        PasswordHash = passwordHash
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();

    return Results.Ok(new { user.Id, user.Username, user.Email, user.StudentNumber, user.Major });
});

app.MapPost("/api/auth/login", async (LoginRequest request, TaskManagerContext db) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
    if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new { user.Id, user.Username, user.Email });
});

// Task endpoints
app.MapGet("/api/tasks", async (HttpContext context, TaskManagerContext db) =>
{
    var userId = GetUserIdFromContext(context);
    if (userId == null) return Results.Unauthorized();

    var tasks = await db.Tasks
        .Where(t => t.UserId == userId)
        .OrderByDescending(t => t.CreatedAt)
        .ToListAsync();

    return Results.Ok(tasks);
});

app.MapPost("/api/tasks", async (CreateTaskRequest request, HttpContext context, TaskManagerContext db) =>
{
    var userId = GetUserIdFromContext(context);
    if (userId == null) return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Course) || string.IsNullOrWhiteSpace(request.Priority))
    {
        return Results.BadRequest("Title, course and priority are required");
    }

    var task = new TaskItem
    {
        Title = request.Title,
        Description = request.Description ?? "",
        Course = request.Course,
        Priority = request.Priority,
        Deadline = request.Deadline,
        Status = request.Status,
        UserId = userId.Value
    };

    db.Tasks.Add(task);
    await db.SaveChangesAsync();

    return Results.Created($"/api/tasks/{task.Id}", task);
});

app.MapPut("/api/tasks/{id}", async (int id, UpdateTaskRequest request, HttpContext context, TaskManagerContext db) =>
{
    var userId = GetUserIdFromContext(context);
    if (userId == null) return Results.Unauthorized();

    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    if (task == null) return Results.NotFound();

    task.Title = request.Title ?? task.Title;
    task.Description = request.Description ?? task.Description;
    task.Course = request.Course ?? task.Course;
    task.Priority = request.Priority ?? task.Priority;
    task.Deadline = request.Deadline ?? task.Deadline;
    task.Status = request.Status ?? task.Status;
    task.UpdatedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();

    return Results.Ok(task);
});

app.MapDelete("/api/tasks/{id}", async (int id, HttpContext context, TaskManagerContext db) =>
{
    var userId = GetUserIdFromContext(context);
    if (userId == null) return Results.Unauthorized();

    var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    if (task == null) return Results.NotFound();

    db.Tasks.Remove(task);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

app.Urls.Add("http://localhost:5001");

app.Run();

// Helper methods
static string HashPassword(string password)
{
    using var sha256 = SHA256.Create();
    var bytes = Encoding.UTF8.GetBytes(password);
    var hash = sha256.ComputeHash(bytes);
    return Convert.ToBase64String(hash);
}

static bool VerifyPassword(string password, string hash)
{
    return HashPassword(password) == hash;
}

static int? GetUserIdFromContext(HttpContext context)
{
    // For simplicity, we'll use a header. In production, use JWT tokens
    var userIdHeader = context.Request.Headers["X-User-Id"].FirstOrDefault();
    return int.TryParse(userIdHeader, out var userId) ? userId : null;
}

// Request/Response models
record RegisterRequest(string Username, string Email, string Password, string StudentNumber, string Major);
record LoginRequest(string Username, string Password);
record CreateTaskRequest(string Title, string? Description, string Course, string Priority, DateTime Deadline, string Status);
record UpdateTaskRequest(string? Title, string? Description, string? Course, string? Priority, DateTime? Deadline, string? Status);
