class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> None:
        """
        Do not return anything, modify matrix in-place instead.
        """
        columns = []
        for ele,li in enumerate(matrix):
            for col in range(len(li)):
                if li[col] == 0:
                    matrix[ele] = [0]*len(matrix[ele])
                    columns.append(col)
                    continue
        
        for i in range(len(matrix)):
            for j in columns:
                matrix[i][j] = 0

        return matrix

        