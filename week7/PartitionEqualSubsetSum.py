class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total_sum = sum(nums)
        
        if total_sum % 2 != 0:
            return False
        
        target = total_sum // 2

        possible = {0}
        
        for num in nums:
            new_sums = set()
            for s in possible:
                new_sums.add(s + num)
            
            possible.update(new_sums)
            
            if target in possible:
                return True
        
        return target in possible