
Evaluating capability of non-temporal axis representations of Ngram data
========================================================================

We will be creating an interactive visualization that allows users to see
many words in a single frame.  The goal is to see if we can create a
scatter-plot visualization without an explicit temporal axis that rivals
traditional temporal axis based visualizations for identifying interesting
words and exploring word histories.

We will attempt to address issues of scale - allowing users to find
"interesting" words and/or inter-word relationships from a very large
dataset.  A web based solution in particular will have bandwidth
restrictions (implicit and explicit). We will explore creative way(s) for
allowing users to (interactively) define what makes words "interesting"

Goals
-----

* Learn about web-based design challenges (e.g. client/server interaction,
  bandwidth limitations, etc.)

* Learn how to program in javascript.

* Learn how to use the D3 graphics tookit

* See how good (or not) our Ngram Design Challenge designs are.

* Explore the Ngram data more, and perhaps find interesting words and
  relationships.


Milestones
----------

* Week 2 (March 9) - We will have completed a simple, web-based visualization 
  with D3 using a dummy dataset and featuring little interactivity.

* Week 3 (March 16) - We will have incorporated the Google dataset and will 
  have a plan for addressing the scaling issue.

* Week 4 (March 23) - We will have designed and mostly implemented some level 
  of interactivity.

* Week 5 (March 30) - Have completed the tool, as well as a write-up about the 
  process/result.

Outcomes/Deliverables
---------------------

* web-based implementation of visualization for ngrams data

  - likely will be a hybrid of ideas from our Design Challenge designs

  - will have interactive features.

* Some sort of assessment of the "goodness" of our design with respect to
  more traditional designs.  Perhaps qualitative, perhaps empirical.
  
* A 2-4 page paper outlining and evaluating our implementation and its design, 
  as well as documenting the process.


Resources
---------

* Google n-grams dataset (1-grams only)

* D3 javascript toolkit

* Design Challenge designs

  - Eric's page density scatter plot
  - Robert's word collage

* Visual Thinking for Design by Colin Ware


Evaluation Plan
---------------

The main thing we will judge ourselves on will be the efficiency and usefulness 
of web-based scaling approach. Our goal is to have a tool that loads quickly on 
a web-browser and allows the user to dynamically interact with the (very) large 
dataset. Another evaluation criteria will be the usefulness of our actual design, 
and whether or not it highlights interesting words or relationships between words. 
However, this criteria is secondary.

