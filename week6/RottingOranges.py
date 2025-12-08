class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        queue = deque()
        fresh_count = 0
        
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 2:
                    queue.append((r, c)) 
                elif grid[r][c] == 1:
                    fresh_count += 1
        
        if fresh_count == 0:
            return 0
        
        minutes = 0
        directions = [(0, 1), (1, 0), (0, -1), (-1, 0)] 
        
        while queue:
            level_size = len(queue)
            rotted_this_minute = False
            
            for _ in range(level_size):
                row, col = queue.popleft()
                
                for dr, dc in directions:
                    new_row, new_col = row + dr, col + dc
                    
                    if (0 <= new_row < rows and 
                        0 <= new_col < cols and 
                        grid[new_row][new_col] == 1):
                        
                        grid[new_row][new_col] = 2
                        queue.append((new_row, new_col))
                        fresh_count -= 1
                        rotted_this_minute = True
            
            if rotted_this_minute:
                minutes += 1
        
        return minutes if fresh_count == 0 else -1