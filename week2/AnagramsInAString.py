class Solution:
    def findAnagrams(self, s: str, p: str) -> List[int]:
        n = len(s)
        m = len(p)

        sortedp = ''.join(sorted(p))

        res = []

        for i in range(n - m + 1):
            curr = s[i:i + m]
            curr = ''.join(sorted(curr))

            if sortedp == curr:
                res.append(i)

        return res
            