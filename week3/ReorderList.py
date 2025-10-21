# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
class Solution:
    def reorderList(self, head: Optional[ListNode]) -> None:
        """
        Do not return anything, modify head in-place instead.
        """
    
        slow = head
        fast = slow.next
        
        while fast is not None and fast.next is not None:
            slow = slow.next
            fast = fast.next.next

        # Split the linked list into two halves
        head1 = head
        head2 = slow.next
        slow.next = None

        # Reverse the second half
        head2 = self.reverselist(head2)

        # Merge alternate heads
        head = ListNode(0)  
        curr = head
        
        while head1 is not None or head2 is not None:

            if head1 is not None:
                curr.next = head1
                curr = curr.next
                head1 = head1.next

            if head2 is not None:
                curr.next = head2
                curr = curr.next
                head2 = head2.next

        return head.next


    def reverselist(self, head):
        
        prev = None
        curr = head
        next = None
        
        while curr is not None:
            next = curr.next
            curr.next = prev
            prev = curr
            curr = next
        
        head = prev
        return head
        