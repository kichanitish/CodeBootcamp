# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
class Solution:
    def reverse(self, head):
        prev = None
        curr = head
        while curr:
            next_node = curr.next
            curr.next = prev
            prev = curr
            curr = next_node
        return prev

    def isIdentical(self, n1, n2):
        while n1 and n2:
            if n1.val != n2.val:
                return False
            n1 = n1.next
            n2 = n2.next
        return True

    def isPalindrome(self, head: Optional[ListNode]) -> bool:
        if head is None or head.next is None:
            return True

        slow, fast = head, head

        while fast.next and fast.next.next:
            slow = slow.next
            fast = fast.next.next

        head2 = self.reverse(slow.next)
        slow.next = None

        ret = self.isIdentical(head, head2)

        head2 = self.reverse(head2)
        slow.next = head2

        return ret
        


