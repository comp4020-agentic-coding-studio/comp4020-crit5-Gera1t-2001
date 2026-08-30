# Crit 5 reflection

## What was the breakthrough that moved the work forward?

I set one mechanic as a hard constraint: later waves get harder by raising the
proportion of decoys, not by shortening exposure, so pressure falls on judgement
rather than reaction speed. Minutes later, asked how decoys should look, I gave
them a clearly different silhouette from the moles — an accessibility decision,
so a player could tell them apart without relying on colour. I did not notice
the two decisions were related at all.

The agent did. Instead of building the wave table, it dispatched a separate
planning agent to test the maths — deliberately not a fork of itself, so the
check would not inherit its own blind spot. The answer came back against both of
us: raising the decoy ratio only adds difficulty if decoys are expensive to
identify, and the silhouette I chose for accessibility was exactly what made
rejecting one cheap. My two decisions were not in tension — they were mutually
exclusive.

Both were good decisions on their own terms. There was no bug and nothing to see
on screen; the conflict lived in the gap between them, and it surfaced before any
code existed only because something went looking for it.

## What did this work change about who I want to be as a software developer?

Coming from supply chain management, most of this degree has been spent worrying
about whether I can get code to work. This week the code worked — forty-one
tests passed and the game ran. What nearly failed was a judgement I made in my
head in five seconds and never wrote down, and no test would have caught it,
because tests only know the rules I give them.

I used to picture the agent as something that carries out decisions I have
already made. What actually moved the work forward was the opposite: it refused
to build what I specified until it had checked whether my specification made
sense. My confident decisions are the least examined ones, precisely because I
am confident.
