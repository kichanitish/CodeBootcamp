class Solution:
    def myAtoi(self, s: str) -> int:
        sign = 1
        res = 0
        idx = 0
        n = len(s)

        while idx < n and s[idx] == ' ':
            idx += 1

        if idx < n and (s[idx] == '+' or s[idx] == '-'):
            if s[idx] == '-':
                sign = -1
            idx += 1

        while idx < n and '0' <= s[idx] <= '9':
            digit = ord(s[idx]) - ord('0')
            res = 10 * res + digit

            if res > 2**31 - 1:
                return (2**31 - 1) if sign == 1 else -2**31

            idx += 1

        return res * sign


        