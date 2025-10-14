class Solution:
    def reverseWords(self, s: str) -> str:
        s = s[::-1]

        n = len(s)
        i = 0
        result = []

        l = 0
        while l < n:
            if s[l] != ' ':
            
                if i != 0:
                    result.append(' ')
                    i += 1

                r = l
                while r < n and s[r] != ' ':
                    result.append(s[r])
                    i += 1
                    r += 1

                result[i - (r - l):i] = reversed(result[i - (r - l):i])

                l = r
            l += 1

        return ''.join(result)
        