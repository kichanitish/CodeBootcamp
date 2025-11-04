class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        answer = [0] * n 
        
        stack = [] 
        
        for i, current_temp in enumerate(temperatures):
            while stack and current_temp > temperatures[stack[-1]]:
                prev_i = stack.pop()
                
                answer[prev_i] = i - prev_i
            
            stack.append(i)
            
        return answer


            

        