# Client intake

Ask these on the first visit or call, and write the answers into the new
client's `CLIENT.md` and `client.json`. Most answers become Settings, not
code; nothing here should need a developer. Ask in Urdu or English, as the
owner prefers.

## The business

1. Company name exactly as on your bills. A short name for the app.
2. Address, phone, email, NTN, STRN. GST on your invoices: yes or no, and the rate.
3. What do you make? What do you buy to make it?
4. How do you keep records today: a register, Excel, another program?
   *(Ask for a copy or a photo. Match its words and column order.)*
5. How many people will use it? Who are the owners (admins), who are the
   floor staff (workers)? On phones, a laptop, or both?

## Items (picks the template and the item fields)

6. Raw materials: what are the main ones, and what are they counted in
   (kg, pieces, reels, rolls, bags)?
7. Products: what are the main ones, and what are they sold in (cartons,
   bundles, packets, kg)?
8. Do items have a **size**? How is it written (mm x yards, inches L x W x H)?
9. Do they have a **thickness or grade number** (micron, gsm, gauge)?
10. A **colour, type or ply**?
11. A **pack count** (rolls per carton, pieces per bundle)?
12. Brands you buy or sell by name?

| Answers | Template |
|---|---|
| Tape from jumbo rolls, stretch film, strapping | `packaging-tape` |
| Cartons, boxes, corrugated sheet | `corrugated-carton` |
| Poly bags, shopping bags, plastic film | `plastic-bags` |
| Anything else | `general`, then switch on the fields they need |

## Production

13. For one product, how much of each raw material goes into one unit?
    *(These become recipes; get two or three examples to enter together.)*
14. Who records production, and when (each shift, end of day)?

## Money

15. Do customers buy on credit (udhaar)? Roughly how many customers and
    suppliers? What do they owe and are owed today (opening balances)?
16. How are payments made: cash, bank transfer, cheque?
17. Invoice terms to print (for example "Payment within 30 days").
18. Which workers may take cash, see balances, see reports or void entries?

## Starting

19. A start date for opening stock and opening balances (best: the 1st of a month).
20. Who will count the opening stock, and when?

## Agreement (for you)

- Setup fee, monthly or yearly fee, billing day.
- What setup includes: data entry of opening stock and balances, training
  visits, support hours.
- Their own address (domain) or `<name>.vercel.app`.
