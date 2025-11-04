class Solution:
    def peopleAwareOfSecret(self, n: int, delay: int, forget: int) -> int:
        MOD = 10**9 + 7
        
        dp = [0] * (n + 1)
        dp[1] = 1

        for day in range(2, n + 1):
            for discovered_day in range(max(1, day - forget + 1), day - delay + 1):
                if discovered_day >= 1:
                    dp[day] = (dp[day] + dp[discovered_day]) % MOD
        
        result = 0
        for day in range(max(1, n - forget + 1), n + 1):
            result = (result + dp[day]) % MOD
        
        return result

        